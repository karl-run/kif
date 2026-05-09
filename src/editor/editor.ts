import { fileSlice } from './state/file-slice.ts'
import { getFile, rememberFile } from './state/file-registry.ts'
import { store } from './state/redux.ts'
import { decodeGif, type GifFrame } from './gif.ts'

const filePickerShell = document.getElementById('kif-file-picker-shell')
const filePickerInput = document.getElementById('kif-file-picker')
const canvasEl = document.getElementById('da-canvas') as HTMLCanvasElement
const canvasContext = canvasEl.getContext('2d', { willReadFrequently: true })!

if (canvasContext == null) {
  throw new Error('A 2D canvas context is required to preview GIFs.')
}

const previewState: {
  currentFileId: string | null
  currentFrameIndex: number
  frames: GifFrame[]
  playbackTimer: number | null
} = {
  currentFileId: null,
  currentFrameIndex: 0,
  frames: [],
  playbackTimer: null,
}

if (filePickerShell && filePickerInput instanceof HTMLInputElement) {
  const setDragging = (dragging: boolean) => {
    filePickerInput.classList.toggle('border-sky-400', dragging)
    filePickerInput.classList.toggle('bg-sky-50', dragging)
  }

  const syncPickedFile = () => {
    const file = filePickerInput.files?.[0]
    store.dispatch(fileSlice.actions.file(file ? rememberFile(file) : null))
  }

  filePickerShell.addEventListener('dragenter', () => setDragging(true))
  filePickerShell.addEventListener('dragleave', () => setDragging(false))
  filePickerShell.addEventListener('drop', () => {
    setDragging(false)
  })
  filePickerInput.addEventListener('change', syncPickedFile)
}

store.subscribe(() => {
  void syncPreviewToState()
})

async function syncPreviewToState(): Promise<void> {
  const currentFileRef = store.getState().files.currentFile

  if (!currentFileRef || currentFileRef.id === previewState.currentFileId) {
    return
  }

  const file = getFile(currentFileRef.id)

  if (!file) {
    return
  }

  const decodedGif = await decodeGif(file)

  stopPlayback()
  previewState.currentFileId = currentFileRef.id
  previewState.currentFrameIndex = 0
  previewState.frames = decodedGif.frames

  canvasEl.width = decodedGif.width
  canvasEl.height = decodedGif.height

  renderFrame(0)
  scheduleNextFrame()
}

function renderFrame(frameIndex: number): void {
  const frame = previewState.frames[frameIndex]

  if (!frame) {
    return
  }

  canvasContext.putImageData(frame.imageData, 0, 0)
  previewState.currentFrameIndex = frameIndex
}

function scheduleNextFrame(): void {
  const currentFrame = previewState.frames[previewState.currentFrameIndex]

  if (!currentFrame) {
    return
  }

  previewState.playbackTimer = window.setTimeout(() => {
    const nextFrameIndex = (previewState.currentFrameIndex + 1) % previewState.frames.length
    renderFrame(nextFrameIndex)
    scheduleNextFrame()
  }, normalizeDelay(currentFrame.delay))
}

function stopPlayback(): void {
  if (previewState.playbackTimer !== null) {
    window.clearTimeout(previewState.playbackTimer)
    previewState.playbackTimer = null
  }
}

function normalizeDelay(delay: number): number {
  if (delay <= 0) {
    return 100
  }

  return Math.max(delay, 20)
}
