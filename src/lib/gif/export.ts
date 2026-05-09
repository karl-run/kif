import { applyPalette, GIFEncoder, quantize } from 'gifenc'

import type { GifFrame } from './types.ts'

export function exportGif(frames: GifFrame[], width: number, height: number, overlayCanvas: HTMLCanvasElement): Blob {
  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = width
  exportCanvas.height = height

  const exportContext = exportCanvas.getContext('2d', { willReadFrequently: true })

  if (!exportContext) {
    throw new Error('A 2D canvas context is required to export GIFs.')
  }

  const encoder = GIFEncoder()

  for (const frame of frames) {
    exportContext.putImageData(frame.imageData, 0, 0)
    exportContext.drawImage(overlayCanvas, 0, 0)

    const imageData = exportContext.getImageData(0, 0, width, height)
    const palette = quantize(imageData.data, 256)
    const indexed = applyPalette(imageData.data, palette)

    encoder.writeFrame(indexed, width, height, {
      delay: frame.delay,
      palette,
      repeat: 0,
    })
  }

  encoder.finish()

  return new Blob([new Uint8Array(encoder.bytes())], { type: 'image/gif' })
}