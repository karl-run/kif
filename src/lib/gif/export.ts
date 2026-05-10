import { applyPalette, GIFEncoder, quantize } from 'gifenc'

import { normalizeGifDelay } from './timing.ts'
import type { GifFrame } from './types.ts'

const GIF_QUANTIZE_FORMAT = 'rgba4444'
const MAX_GIF_COLORS = 256

export function exportGif(
  frames: GifFrame[],
  width: number,
  height: number,
  getOverlayCanvas: (frameIndex: number) => HTMLCanvasElement,
): Blob {
  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = width
  exportCanvas.height = height

  const exportContext = exportCanvas.getContext('2d', { willReadFrequently: true })

  if (!exportContext) {
    throw new Error('A 2D canvas context is required to export GIFs.')
  }

  const encoder = GIFEncoder()

  frames.forEach((frame, frameIndex) => {
    const imageData = renderExportFrame(exportContext, frame, frameIndex, getOverlayCanvas, width, height)
    const { indexed, palette, transparentIndex } = encodeImageData(imageData)

    encoder.writeFrame(indexed, width, height, {
      delay: normalizeGifDelay(frame.delay),
      dispose: transparentIndex >= 0 ? 2 : 1,
      palette,
      repeat: 0,
      transparent: transparentIndex >= 0,
      transparentIndex,
    })
  })

  encoder.finish()

  return new Blob([new Uint8Array(encoder.bytes())], { type: 'image/gif' })
}

function renderExportFrame(
  exportContext: CanvasRenderingContext2D,
  frame: GifFrame,
  frameIndex: number,
  getOverlayCanvas: (frameIndex: number) => HTMLCanvasElement,
  width: number,
  height: number,
): ImageData {
  exportContext.putImageData(frame.imageData, 0, 0)
  exportContext.drawImage(getOverlayCanvas(frameIndex), 0, 0)

  return exportContext.getImageData(0, 0, width, height)
}

function encodeImageData(imageData: ImageData) {
  const palette = quantize(imageData.data, MAX_GIF_COLORS, {
    clearAlpha: true,
    format: GIF_QUANTIZE_FORMAT,
    oneBitAlpha: true,
  })
  const indexed = applyPalette(imageData.data, palette, GIF_QUANTIZE_FORMAT)
  const transparentIndex = findTransparentPaletteIndex(palette)

  return { indexed, palette, transparentIndex }
}

function findTransparentPaletteIndex(palette: ArrayLike<ArrayLike<number>>): number {
  for (let index = 0; index < palette.length; index += 1) {
    if (palette[index]?.[3] === 0) {
      return index
    }
  }

  return -1
}
