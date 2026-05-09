import { exportGif } from '@gif/export.ts'
import { decodeGif } from '@gif/decode.ts'
import type { GifFrame } from '@gif/types.ts'

import { getFile, rememberFile } from './state/file-registry.ts'
import { fileSlice } from './state/file-slice.ts'
import { store } from './state/redux.ts'

import {
  canvasEl,
  exportGifButtonEl,
  exportedGifDialogEl,
  exportedGifDownloadEl,
  exportedGifImageEl,
  fabricCanvasEl,
  filePickerInput,
  filePickerShell,
  gifHeightEl,
  gifWidthEl,
  stepBackwardButtonEl,
  stepForwardButtonEl,
  togglePlaybackButtonEl,
} from './nodes.ts'
import { OverlayCanvas } from './fabric-canvas.ts'
import { waitForImpactFont } from './fonts.ts'
import { initializeNodeSync } from './fabric-node-sync.ts'

const canvasContext = canvasEl.getContext('2d', { willReadFrequently: true })!
const fabricCanvas = new OverlayCanvas(fabricCanvasEl)
let nodeSync: ReturnType<typeof initializeNodeSync> | null = null

if (canvasContext == null) {
  throw new Error('A 2D canvas context is required to preview GIFs.')
}

const previewState: {
  currentFileId: string | null
  frames: GifFrame[]
  exportedGifUrl: string | null
  playbackTimer: number | null
} = {
  currentFileId: null,
  exportedGifUrl: null,
  frames: [],
  playbackTimer: null,
}

void bootstrapNodeSync()

let previousFileId = store.getState().files.currentFile?.id ?? null
let previousPlaybackState = {
  currentPreviewFrameIndex: store.getState().files.currentPreviewFrameIndex,
  currentGifFrameCount: store.getState().files.currentGifFrameCount,
  isPreviewPlaying: store.getState().files.isPreviewPlaying,
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

if (exportGifButtonEl && exportedGifDialogEl && exportedGifImageEl && exportedGifDownloadEl) {
  exportGifButtonEl.disabled = true
  exportGifButtonEl.addEventListener('click', () => {
    exportGifToDialog()
  })
}

if (togglePlaybackButtonEl) {
  togglePlaybackButtonEl.disabled = true
  togglePlaybackButtonEl.addEventListener('click', () => {
    togglePlayback()
  })
}

if (stepBackwardButtonEl) {
  stepBackwardButtonEl.disabled = true
  stepBackwardButtonEl.addEventListener('click', () => {
    stepFrame(-1)
  })
}

if (stepForwardButtonEl) {
  stepForwardButtonEl.disabled = true
  stepForwardButtonEl.addEventListener('click', () => {
    stepFrame(1)
  })
}

store.subscribe(() => {
  const state = store.getState()
  const currentFileId = state.files.currentFile?.id ?? null

  if (currentFileId !== previousFileId) {
    previousFileId = currentFileId
    void syncPreviewToState()
  }

  if (
    state.files.currentPreviewFrameIndex !== previousPlaybackState.currentPreviewFrameIndex ||
    state.files.currentGifFrameCount !== previousPlaybackState.currentGifFrameCount ||
    state.files.isPreviewPlaying !== previousPlaybackState.isPreviewPlaying
  ) {
    previousPlaybackState = {
      currentPreviewFrameIndex: state.files.currentPreviewFrameIndex,
      currentGifFrameCount: state.files.currentGifFrameCount,
      isPreviewPlaying: state.files.isPreviewPlaying,
    }
    syncPlaybackFromState()
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
  previewState.frames = decodedGif.frames
  store.dispatch(fileSlice.actions.gifFrameCount(decodedGif.frames.length))
  store.dispatch(fileSlice.actions.previewFrameIndex(0))
  store.dispatch(fileSlice.actions.previewPlaying(true))

  canvasEl.width = decodedGif.width
  canvasEl.height = decodedGif.height
  fabricCanvas.setDimensions({ width: decodedGif.width, height: decodedGif.height })
  gifWidthEl.textContent = `${decodedGif.width}px`
  gifHeightEl.textContent = `${decodedGif.height}px`
  syncExportAvailability()
  syncPlaybackAvailability()

  renderFrame(0)
}

function renderFrame(frameIndex: number): void {
  const frame = previewState.frames[frameIndex]

  if (!frame) {
    return
  }

  canvasContext.putImageData(frame.imageData, 0, 0)
  nodeSync?.renderFrame(frameIndex, previewState.frames.length)
}

function scheduleNextFrame(): void {
  if (!store.getState().files.isPreviewPlaying || previewState.playbackTimer !== null) {
    return
  }

  const currentFrameIndex = store.getState().files.currentPreviewFrameIndex
  const currentFrame = previewState.frames[currentFrameIndex]

  if (!currentFrame) {
    return
  }

  previewState.playbackTimer = window.setTimeout(() => {
    previewState.playbackTimer = null

    if (!store.getState().files.isPreviewPlaying || previewState.frames.length === 0) {
      return
    }

    const nextFrameIndex = (store.getState().files.currentPreviewFrameIndex + 1) % previewState.frames.length
    store.dispatch(fileSlice.actions.previewFrameIndex(nextFrameIndex))
  }, normalizeDelay(currentFrame.delay))
}

function stopPlayback(): void {
  if (previewState.playbackTimer !== null) {
    window.clearTimeout(previewState.playbackTimer)
    previewState.playbackTimer = null
  }
}

function togglePlayback(): void {
  if (previewState.frames.length === 0) {
    return
  }

  store.dispatch(fileSlice.actions.previewPlaying(!store.getState().files.isPreviewPlaying))
}

function stepFrame(direction: -1 | 1): void {
  if (previewState.frames.length === 0) {
    return
  }

  const currentFrameIndex = store.getState().files.currentPreviewFrameIndex
  const nextFrameIndex = (currentFrameIndex + direction + previewState.frames.length) % previewState.frames.length
  store.dispatch(fileSlice.actions.previewFrameIndex(nextFrameIndex))
}

function normalizeDelay(delay: number): number {
  if (delay <= 0) {
    return 100
  }

  return Math.max(delay, 20)
}

async function bootstrapNodeSync(): Promise<void> {
  await waitForImpactFont()

  nodeSync = initializeNodeSync({
    fabricCanvas,
    onNodesRendered: () => {},
    store,
  })
}

function exportGifToDialog(): void {
  if (
    previewState.frames.length === 0 ||
    !exportedGifDialogEl ||
    !exportedGifDownloadEl ||
    !exportedGifImageEl ||
    !exportGifButtonEl
  ) {
    return
  }

  exportGifButtonEl.disabled = true
  const exportedGif = exportGif(previewState.frames, canvasEl.width, canvasEl.height, (frameIndex) =>
    nodeSync ? nodeSync.toCanvasElementForFrame(frameIndex, previewState.frames.length) : fabricCanvas.toCanvasElement(),
  )
  const exportedGifUrl = URL.createObjectURL(exportedGif)

  if (previewState.exportedGifUrl) {
    URL.revokeObjectURL(previewState.exportedGifUrl)
  }

  previewState.exportedGifUrl = exportedGifUrl
  exportedGifImageEl.src = exportedGifUrl
  exportedGifDownloadEl.href = exportedGifUrl
  exportedGifDialogEl.showModal()
  nodeSync?.renderFrame(store.getState().files.currentPreviewFrameIndex, previewState.frames.length)
  syncExportAvailability()
}

function syncExportAvailability(): void {
  if (!exportGifButtonEl) {
    return
  }

  exportGifButtonEl.disabled = previewState.frames.length === 0
}

function syncPlaybackAvailability(): void {
  const { currentGifFrameCount, isPreviewPlaying } = store.getState().files

  if (!togglePlaybackButtonEl) {
    return
  }

  togglePlaybackButtonEl.disabled = currentGifFrameCount === 0
  togglePlaybackButtonEl.textContent = isPreviewPlaying ? '❚❚' : '▶'
  togglePlaybackButtonEl.setAttribute('aria-label', isPreviewPlaying ? 'Pause preview' : 'Play preview')

  if (stepBackwardButtonEl) {
    stepBackwardButtonEl.disabled = currentGifFrameCount === 0
  }

  if (stepForwardButtonEl) {
    stepForwardButtonEl.disabled = currentGifFrameCount === 0
  }
}

function syncPlaybackFromState(): void {
  const { currentGifFrameCount, currentPreviewFrameIndex, isPreviewPlaying } = store.getState().files

  syncPlaybackAvailability()

  if (currentGifFrameCount === 0 || previewState.frames.length === 0) {
    stopPlayback()
    return
  }

  renderFrame(currentPreviewFrameIndex)

  if (!isPreviewPlaying) {
    stopPlayback()
    return
  }

  scheduleNextFrame()
}
