import { decompressFrames, type ParsedFrame, parseGIF } from 'gifuct-js'

import type { GifFrame } from './types.ts'

type DecodedGif = {
  frames: GifFrame[]
  height: number
  width: number
}

export async function decodeGif(file: File): Promise<DecodedGif> {
  const parsedGif = parseGIF(await file.arrayBuffer())
  const patchFrames = decompressFrames(parsedGif, true)
  const { width, height } = parsedGif.lsd
  const workingCanvas = document.createElement('canvas')
  workingCanvas.width = width
  workingCanvas.height = height
  const patchCanvas = document.createElement('canvas')

  const workingContext = workingCanvas.getContext('2d', { willReadFrequently: true })
  const patchContext = patchCanvas.getContext('2d', { willReadFrequently: true })

  if (!workingContext || !patchContext) {
    throw new Error('A 2D canvas context is required to decode GIFs.')
  }

  const decodedFrames: GifFrame[] = []
  let previousDisposal = 0
  let previousPatchDims: ParsedFrame['dims'] | null = null
  let previousSnapshot: ImageData | null = null
  let patchImageData: ImageData | null = null

  for (const frame of patchFrames) {
    if (previousDisposal === 2 && previousPatchDims) {
      workingContext.clearRect(
        previousPatchDims.left,
        previousPatchDims.top,
        previousPatchDims.width,
        previousPatchDims.height,
      )
    } else if (previousDisposal === 3 && previousSnapshot) {
      workingContext.putImageData(previousSnapshot, 0, 0)
    }

    const restoreTarget = frame.disposalType === 3 ? workingContext.getImageData(0, 0, width, height) : null

    if (patchCanvas.width !== frame.dims.width || patchCanvas.height !== frame.dims.height) {
      patchCanvas.width = frame.dims.width
      patchCanvas.height = frame.dims.height
      patchImageData = null
    }

    if (!patchImageData) {
      patchImageData = patchContext.createImageData(frame.dims.width, frame.dims.height)
    }

    patchImageData.data.set(frame.patch)
    patchContext.putImageData(patchImageData, 0, 0)
    workingContext.drawImage(
      patchCanvas,
      frame.dims.left,
      frame.dims.top,
    )

    decodedFrames.push({
      delay: normalizeDelay(frame.delay),
      imageData: workingContext.getImageData(0, 0, width, height),
    })

    previousDisposal = frame.disposalType
    previousPatchDims = frame.dims
    previousSnapshot = restoreTarget
  }

  return {
    width,
    height,
    frames: decodedFrames,
  }
}

function normalizeDelay(delay: number): number {
  if (delay <= 0) {
    return 100
  }

  return Math.max(delay, 20)
}
