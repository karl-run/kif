import { exportGif } from '@gif/export.ts'
import { decodeGif } from '@gif/decode.ts'
import type { GifFrame } from '@gif/types.ts'

import { getFile, rememberFile } from './state/file-registry.ts'
import { fileSlice } from './state/file-slice.ts'
import { store } from './state/redux.ts'

import { canvasEl, fabricCanvasEl, filePickerInput, filePickerShell, gifHeightEl, gifWidthEl } from './nodes.ts'
import { OverlayCanvas } from './fabric-canvas.ts'
import { waitForImpactFont } from './fonts.ts'
import { initializeNodeSync } from './fabric-node-sync.ts'

const canvasContext = canvasEl.getContext('2d', { willReadFrequently: true })!
const fabricCanvas = new OverlayCanvas(fabricCanvasEl)

if (canvasContext == null) {
  throw new Error('A 2D canvas context is required to preview GIFs.')
}

const previewState: {
  currentFileId: string | null
  currentFrameIndex: number
  frames: GifFrame[]
  exportedGifUrl: string | null
  playbackTimer: number | null
} = {
  currentFileId: null,
  currentFrameIndex: 0,
  exportedGifUrl: null,
  frames: [],
  playbackTimer: null,
}

void bootstrapNodeSync()

let previousFileId = store.getState().files.currentFile?.id ?? null

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
  const state = store.getState()
  const currentFileId = state.files.currentFile?.id ?? null

  if (currentFileId !== previousFileId) {
    previousFileId = currentFileId
    void syncPreviewToState()
  }
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
  fabricCanvas.setDimensions({ width: decodedGif.width, height: decodedGif.height })
  gifWidthEl.textContent = `${decodedGif.width}px`
  gifHeightEl.textContent = `${decodedGif.height}px`

  renderFrame(0)
  renderExportPreview()
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

async function bootstrapNodeSync(): Promise<void> {
  await waitForImpactFont()

  initializeNodeSync({
    fabricCanvas,
    onNodesRendered: () => {
      if (previewState.frames.length > 0) {
        renderExportPreview()
      }
    },
    store,
  })
}

function renderExportPreview(): void {
  const overlayCanvas = fabricCanvas.toCanvasElement()
  const exportedGif = exportGif(previewState.frames, canvasEl.width, canvasEl.height, overlayCanvas)
  const exportedGifUrl = URL.createObjectURL(exportedGif)
  const exportedGifImage = getExportedGifImage()

  if (previewState.exportedGifUrl) {
    URL.revokeObjectURL(previewState.exportedGifUrl)
  }

  previewState.exportedGifUrl = exportedGifUrl
  exportedGifImage.src = exportedGifUrl
}

function getExportedGifImage(): HTMLImageElement {
  const existingImage = document.getElementById('exported-gif-preview')

  if (existingImage instanceof HTMLImageElement) {
    return existingImage
  }

  const image = document.createElement('img')
  image.id = 'exported-gif-preview'
  document.body.append(image)
  return image
}
