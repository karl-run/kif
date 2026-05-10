import { exportGif } from '@gif/export.ts'
import { decodeGif } from '@gif/decode.ts'
import { getFramePlaybackDelay } from '@gif/timing.ts'
import type { GifFrame } from '@gif/types.ts'

import { getFile } from './state/file-registry.ts'
import { fileSlice } from './state/file-slice.ts'
import { store } from './state/redux.ts'

import {
  canvasEl,
  canvasStackShellEl,
  exportGifButtonEl,
  exportedGifDialogEl,
  exportedGifDownloadEl,
  exportedGifImageEl,
  fabricCanvasEl,
  playbackIconPauseEl,
  playbackIconPlayEl,
  previewTimelineHandleEl,
  gifFrameCounterEl,
  gifHeightEl,
  gifWidthEl,
  previewStageEl,
  previewTimelineIndicatorEl,
  previewTimelineShellEl,
  previewTimelineSliderEl,
  previewTimelineThumbnailsEl,
  previewViewportInnerEl,
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
const touchSelectionQuery = typeof window === 'undefined' ? null : window.matchMedia('(pointer: coarse), (hover: none)')
const TIMELINE_THUMBNAIL_COUNT = 8

if (canvasContext == null) {
  throw new Error('A 2D canvas context is required to preview GIFs.')
}

const previewState: {
  currentFileId: string | null
  frames: GifFrame[]
  exportedGifUrl: string | null
  lastRenderStartedAt: number | null
  syncRequestId: number
  playbackTimer: number | null
} = {
  currentFileId: null,
  exportedGifUrl: null,
  frames: [],
  lastRenderStartedAt: null,
  syncRequestId: 0,
  playbackTimer: null,
}

void bootstrapNodeSync()

let previousFileId = store.getState().files.currentFile?.id ?? null
let shouldResumePreviewAfterExportDialog = false
let shouldResumePreviewAfterTimelineScrub = false
let previousPlaybackState = {
  currentPreviewFrameIndex: store.getState().files.currentPreviewFrameIndex,
  currentGifFrameCount: store.getState().files.currentGifFrameCount,
  isPreviewPlaying: store.getState().files.isPreviewPlaying,
}
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

void syncPreviewToState()

if (exportGifButtonEl && exportedGifDialogEl && exportedGifImageEl && exportedGifDownloadEl) {
  exportGifButtonEl.disabled = true
  exportGifButtonEl.addEventListener('click', () => {
    exportGifToDialog()
  })
  exportedGifDialogEl.addEventListener('close', () => {
    if (!shouldResumePreviewAfterExportDialog || previewState.frames.length === 0) {
      shouldResumePreviewAfterExportDialog = false
      return
    }

    shouldResumePreviewAfterExportDialog = false
    store.dispatch(fileSlice.actions.previewPlaying(true))
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

if (previewTimelineSliderEl) {
  previewTimelineSliderEl.disabled = true
  previewTimelineSliderEl.addEventListener('pointerdown', () => {
    if (previewState.frames.length === 0) {
      return
    }

    shouldResumePreviewAfterTimelineScrub = store.getState().files.isPreviewPlaying

    if (shouldResumePreviewAfterTimelineScrub) {
      store.dispatch(fileSlice.actions.previewPlaying(false))
    }
  })
  previewTimelineSliderEl.addEventListener('input', () => {
    const frameIndex = Number.parseInt(previewTimelineSliderEl.value, 10)

    if (Number.isNaN(frameIndex)) {
      return
    }

    store.dispatch(fileSlice.actions.previewFrameIndex(frameIndex))
  })
  previewTimelineSliderEl.addEventListener('change', finishTimelineScrub)
}

document.addEventListener('pointerup', finishTimelineScrub)
document.addEventListener('pointercancel', finishTimelineScrub)

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

  const syncRequestId = previewState.syncRequestId + 1
  previewState.syncRequestId = syncRequestId

  const file = getFile(currentFileRef.id)

  if (!file) {
    return
  }

  const decodedGif = await decodeGif(file)

  if (previewState.syncRequestId !== syncRequestId || store.getState().files.currentFile?.id !== currentFileRef.id) {
    return
  }

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
  renderTimelineThumbnails()
  syncPreviewScale()
  syncExportAvailability()
  syncPlaybackAvailability()
  syncTimelineState()
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
  if (!store.getState().files.isPreviewPlaying || previewState.playbackTimer !== null) {
    return
  }

  const currentFrameIndex = store.getState().files.currentPreviewFrameIndex
  const currentFrame = previewState.frames[currentFrameIndex]

  if (!currentFrame) {
    return
  }

  const renderElapsedMs =
    previewState.lastRenderStartedAt === null ? 0 : performance.now() - previewState.lastRenderStartedAt

  previewState.playbackTimer = window.setTimeout(
    () => {
      previewState.playbackTimer = null

      if (!store.getState().files.isPreviewPlaying || previewState.frames.length === 0) {
        return
      }

      const nextFrameIndex = getWrappedFrameIndex(store.getState().files.currentPreviewFrameIndex, 1)
      store.dispatch(fileSlice.actions.previewFrameIndex(nextFrameIndex))
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
  const nextFrameIndex = getWrappedFrameIndex(currentFrameIndex, direction)
  store.dispatch(fileSlice.actions.previewFrameIndex(nextFrameIndex))
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

  const wasPreviewPlaying = store.getState().files.isPreviewPlaying
  shouldResumePreviewAfterExportDialog = wasPreviewPlaying

  if (wasPreviewPlaying) {
    store.dispatch(fileSlice.actions.previewPlaying(false))
  }

  exportGifButtonEl.disabled = true
  const exportedGif = exportGif(previewState.frames, canvasEl.width, canvasEl.height, (frameIndex) =>
    nodeSync
      ? nodeSync.toCanvasElementForFrame(frameIndex, previewState.frames.length)
      : fabricCanvas.toCanvasElement(),
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
  togglePlaybackButtonEl.setAttribute('aria-label', isPreviewPlaying ? 'Pause preview' : 'Play preview')
  playbackIconPauseEl?.classList.toggle('hidden', !isPreviewPlaying)
  playbackIconPlayEl?.classList.toggle('hidden', isPreviewPlaying)

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
  syncFrameCounter()
  syncTimelineState()

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

function syncFrameCounter(): void {
  if (!gifFrameCounterEl) {
    return
  }

  const { currentGifFrameCount, currentPreviewFrameIndex } = store.getState().files

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

function syncTimelineState(): void {
  const { currentGifFrameCount, currentPreviewFrameIndex } = store.getState().files

  if (!previewTimelineSliderEl || !previewTimelineIndicatorEl || !previewTimelineHandleEl || !previewTimelineShellEl) {
    return
  }

  previewTimelineShellEl.classList.toggle('opacity-50', currentGifFrameCount === 0)
  previewTimelineSliderEl.disabled = currentGifFrameCount === 0
  previewTimelineSliderEl.max = String(Math.max(currentGifFrameCount - 1, 0))
  previewTimelineSliderEl.value = String(Math.min(currentPreviewFrameIndex, Math.max(currentGifFrameCount - 1, 0)))

  const progress = currentGifFrameCount > 1 ? currentPreviewFrameIndex / (currentGifFrameCount - 1) : 0
  previewTimelineIndicatorEl.style.left = `${progress * 100}%`
  previewTimelineHandleEl.style.left = `${progress * 100}%`
  previewTimelineIndicatorEl.classList.toggle('hidden', currentGifFrameCount === 0)
  previewTimelineHandleEl.classList.toggle('hidden', currentGifFrameCount === 0)
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

function finishTimelineScrub(): void {
  if (!shouldResumePreviewAfterTimelineScrub || previewState.frames.length === 0) {
    shouldResumePreviewAfterTimelineScrub = false
    return
  }

  shouldResumePreviewAfterTimelineScrub = false
  store.dispatch(fileSlice.actions.previewPlaying(true))
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
