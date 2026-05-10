import type { GifFrame } from './types.ts'

const DEFAULT_GIF_DELAY_MS = 100

export function normalizeGifDelay(delay: number | undefined): number {
  if (!Number.isFinite(delay) || delay == null || delay <= 0) {
    return DEFAULT_GIF_DELAY_MS
  }

  return delay
}

export function getFramePlaybackDelay(frame: GifFrame, elapsedMs = 0): number {
  return Math.max(0, normalizeGifDelay(frame.delay) - Math.max(0, elapsedMs))
}
