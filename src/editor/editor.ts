import { exportGif } from '@gif/export.ts'
import { decodeGif } from '@gif/decode.ts'
import { getFramePlaybackDelay } from '@gif/timing.ts'
import type { GifFrame } from '@gif/types.ts'

import { registerExportController } from './export-controller.ts'
import { registerPreviewController } from './preview-controller.ts'
import { getFileSignature } from './state/file.ts'
import {
  getPreviewState,
  previewStore,
  resetPreviewState,
  setPreviewFrameCount,
  setPreviewFrameIndex,
  setPreviewPlaying,
} from './state/preview.ts'
import { store } from './state/redux.ts'

import {
  canvasEl,
  canvasStackShellEl,
  fabricCanvasEl,
  gifFrameCounterEl,
  gifHeightEl,
  gifWidthEl,
  previewStageEl,
  previewTimelineThumbnailsEl,
  previewViewportInnerEl,
} from './nodes.ts'
import { OverlayCanvas } from './fabric/fabric-canvas.ts'
import { waitForImpactFont } from './fonts.ts'
import { initializeNodeSync } from './fabric/fabric-node-sync.ts'

const canvasContext = canvasEl.getContext('2d', { willReadFrequently: true })!
const fabricCanvas = new OverlayCanvas(fabricCanvasEl)
let nodeSync: ReturnType<typeof initializeNodeSync> | null = null
const touchSelectionQuery = typeof window === 'undefined' ? null : window.matchMedia('(pointer: coarse), (hover: none)')
const TIMELINE_THUMBNAIL_COUNT = 8

if (canvasContext == null) {
  throw new Error('A 2D canvas context is required to preview GIFs.')
}

const previewState: {
  currentFileSignature: string | null
  frames: GifFrame[]
  lastRenderStartedAt: number | null
  syncRequestId: number
  playbackTimer: number | null
} = {
  currentFileSignature: null,
  frames: [],
  lastRenderStartedAt: null,
  syncRequestId: 0,
  playbackTimer: null,
}

void bootstrapNodeSync()

const initialCurrentFile = store.getState().files.currentFile
let previousFileSignature = initialCurrentFile ? getFileSignature(initialCurrentFile) : null
let shouldResumePreviewAfterExportDialog = false
let previousPlaybackState = getPreviewState()
const previewScaleObserver =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver(() => {
        syncPreviewScale()
      })

syncTouchSelectionMode()
previewScaleObserver?.observe(previewViewportInnerEl)
previewScaleObserver?.observe(canvasStackShellEl)
syncPreviewScale()
touchSelectionQuery?.addEventListener?.('change', syncTouchSelectionMode)

registerExportController({
  exportGif: exportCurrentGif,
  onDialogClosed: handleExportDialogClosed,
})

registerPreviewController({
  syncPreview: () => syncPreviewToState({ force: true }),
})

void syncPreviewToState()

store.subscribe(() => {
  const currentFile = store.getState().files.currentFile
  const currentFileSignature = currentFile ? getFileSignature(currentFile) : null

  if (currentFileSignature !== previousFileSignature) {
    previousFileSignature = currentFileSignature

    if (currentFile === null) {
      stopPlayback()
      previewState.currentFileSignature = null
      previewState.frames = []
      resetPreviewState()
      syncFrameCounter()
      return
    }

    void syncPreviewToState()
  }
})

previewStore.subscribe((state) => {
  if (
    state.currentPreviewFrameIndex !== previousPlaybackState.currentPreviewFrameIndex ||
    state.currentGifFrameCount !== previousPlaybackState.currentGifFrameCount ||
    state.isPreviewPlaying !== previousPlaybackState.isPreviewPlaying
  ) {
    previousPlaybackState = state
    syncPlaybackFromState()
  }
})

async function syncPreviewToState(options?: { force?: boolean }): Promise<void> {
  const currentFile = store.getState().files.currentFile

  if (!currentFile) {
    return
  }

  const currentFileSignature = getFileSignature(currentFile)

  if (!options?.force && currentFileSignature === previewState.currentFileSignature) {
    return
  }

  const syncRequestId = previewState.syncRequestId + 1
  previewState.syncRequestId = syncRequestId
  const decodedGif = await decodeGif(currentFile)

  if (
    previewState.syncRequestId !== syncRequestId ||
    getFileSignature(store.getState().files.currentFile ?? currentFile) !== currentFileSignature
  ) {
    return
  }

  stopPlayback()
  previewState.currentFileSignature = currentFileSignature
  previewState.frames = decodedGif.frames
  setPreviewFrameCount(decodedGif.frames.length)
  setPreviewFrameIndex(0)
  setPreviewPlaying(true)

  canvasEl.width = decodedGif.width
  canvasEl.height = decodedGif.height
  fabricCanvas.setDimensions({ width: decodedGif.width, height: decodedGif.height })
  gifWidthEl.textContent = `${decodedGif.width}px`
  gifHeightEl.textContent = `${decodedGif.height}px`
  renderTimelineThumbnails()
  syncPreviewScale()
  syncFrameCounter()

  renderFrame(0)
  syncPlaybackFromState()
}

function renderFrame(frameIndex: number): void {
  const frame = previewState.frames[frameIndex]

  if (!frame) {
    return
  }

  previewState.lastRenderStartedAt = performance.now()
  canvasContext.putImageData(frame.imageData, 0, 0)
  nodeSync?.renderFrame(frameIndex, previewState.frames.length)
}

function scheduleNextFrame(): void {
  if (!getPreviewState().isPreviewPlaying || previewState.playbackTimer !== null) {
    return
  }

  const currentFrameIndex = getPreviewState().currentPreviewFrameIndex
  const currentFrame = previewState.frames[currentFrameIndex]

  if (!currentFrame) {
    return
  }

  const renderElapsedMs =
    previewState.lastRenderStartedAt === null ? 0 : performance.now() - previewState.lastRenderStartedAt

  previewState.playbackTimer = window.setTimeout(
    () => {
      previewState.playbackTimer = null

      if (!getPreviewState().isPreviewPlaying || previewState.frames.length === 0) {
        return
      }

      const nextFrameIndex = getWrappedFrameIndex(getPreviewState().currentPreviewFrameIndex, 1)
      setPreviewFrameIndex(nextFrameIndex)
    },
    getFramePlaybackDelay(currentFrame, renderElapsedMs),
  )
}

function stopPlayback(): void {
  if (previewState.playbackTimer !== null) {
    window.clearTimeout(previewState.playbackTimer)
    previewState.playbackTimer = null
  }
}

async function bootstrapNodeSync(): Promise<void> {
  await waitForImpactFont()

  nodeSync = initializeNodeSync({
    fabricCanvas,
    onNodesRendered: () => {},
    store,
  })
}

function exportCurrentGif(): Blob | null {
  if (previewState.frames.length === 0) {
    return null
  }

  const wasPreviewPlaying = getPreviewState().isPreviewPlaying
  shouldResumePreviewAfterExportDialog = wasPreviewPlaying

  if (wasPreviewPlaying) {
    setPreviewPlaying(false)
  }

  const exportedGif = exportGif(previewState.frames, canvasEl.width, canvasEl.height, (frameIndex) =>
    nodeSync
      ? nodeSync.toCanvasElementForFrame(frameIndex, previewState.frames.length)
      : fabricCanvas.toCanvasElement(),
  )
  nodeSync?.renderFrame(getPreviewState().currentPreviewFrameIndex, previewState.frames.length)
  return exportedGif
}

function syncPlaybackFromState(): void {
  const { currentGifFrameCount, currentPreviewFrameIndex, isPreviewPlaying } = getPreviewState()

  syncFrameCounter()

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

function handleExportDialogClosed(): void {
  if (!shouldResumePreviewAfterExportDialog || previewState.frames.length === 0) {
    shouldResumePreviewAfterExportDialog = false
    return
  }

  shouldResumePreviewAfterExportDialog = false
  setPreviewPlaying(true)
}

function syncFrameCounter(): void {
  if (!gifFrameCounterEl) {
    return
  }

  const { currentGifFrameCount, currentPreviewFrameIndex } = getPreviewState()

  gifFrameCounterEl.textContent =
    currentGifFrameCount > 0 ? `Frame ${currentPreviewFrameIndex + 1}/${currentGifFrameCount}` : ''
}

function syncTouchSelectionMode(): void {
  const isTouchMode = touchSelectionQuery?.matches ?? false
  const touchAction = isTouchMode ? 'manipulation' : 'none'

  fabricCanvas.selection = !isTouchMode
  fabricCanvas.allowTouchScrolling = isTouchMode
  fabricCanvas.upperCanvasEl.style.touchAction = touchAction
  fabricCanvas.lowerCanvasEl.style.touchAction = touchAction
  fabricCanvas.wrapperEl.style.touchAction = touchAction
}

function renderTimelineThumbnails(): void {
  if (!previewTimelineThumbnailsEl) {
    return
  }

  previewTimelineThumbnailsEl.textContent = ''

  if (previewState.frames.length === 0) {
    return
  }

  const sampleCount = Math.min(TIMELINE_THUMBNAIL_COUNT, previewState.frames.length)
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = canvasEl.width
  sourceCanvas.height = canvasEl.height
  const sourceContext = sourceCanvas.getContext('2d')

  if (!sourceContext) {
    return
  }

  for (let index = 0; index < sampleCount; index += 1) {
    const thumbnailCanvas = document.createElement('canvas')
    thumbnailCanvas.width = 104
    thumbnailCanvas.height = 72
    thumbnailCanvas.className = 'h-full min-w-0 flex-1 bg-zinc-100 dark:bg-zinc-900'

    const thumbnailContext = thumbnailCanvas.getContext('2d')
    const frameIndex =
      sampleCount === 1 ? 0 : Math.round((index / (sampleCount - 1)) * (previewState.frames.length - 1))
    const frame = previewState.frames[frameIndex]

    if (!thumbnailContext || !frame) {
      continue
    }

    sourceContext.putImageData(frame.imageData, 0, 0)
    const scale = Math.max(thumbnailCanvas.width / sourceCanvas.width, thumbnailCanvas.height / sourceCanvas.height)
    const sourceWidth = thumbnailCanvas.width / scale
    const sourceHeight = thumbnailCanvas.height / scale
    const sourceX = Math.max(0, (sourceCanvas.width - sourceWidth) / 2)
    const sourceY = Math.max(0, (sourceCanvas.height - sourceHeight) / 2)

    thumbnailContext.drawImage(
      sourceCanvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      thumbnailCanvas.width,
      thumbnailCanvas.height,
    )
    previewTimelineThumbnailsEl.append(thumbnailCanvas)
  }
}

function getWrappedFrameIndex(frameIndex: number, direction: -1 | 1): number {
  return (frameIndex + direction + previewState.frames.length) % previewState.frames.length
}

function syncPreviewScale(): void {
  if (!previewViewportInnerEl || !previewStageEl || !canvasStackShellEl) {
    return
  }

  const naturalWidth = canvasStackShellEl.offsetWidth
  const naturalHeight = canvasStackShellEl.offsetHeight

  if (naturalWidth === 0 || naturalHeight === 0) {
    return
  }

  const availableWidth = previewViewportInnerEl.clientWidth
  const scale = availableWidth > 0 ? Math.min(1, availableWidth / naturalWidth) : 1

  previewStageEl.style.width = `${Math.round(naturalWidth * scale)}px`
  previewStageEl.style.height = `${Math.round(naturalHeight * scale)}px`
  canvasStackShellEl.style.transform = `scale(${scale})`
}
