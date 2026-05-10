import { decompressFrames, type ParsedFrame, type ParsedGif, parseGIF } from 'gifuct-js'

import { normalizeGifDelay } from './timing.ts'
import type { DecodedGif, GifFrame } from './types.ts'

type GifBackgroundColor = [number, number, number] | null
type RestoreSnapshot = {
  dims: ParsedFrame['dims']
  imageData: ImageData
}

export async function decodeGif(file: File): Promise<DecodedGif> {
  const parsedGif = parseGIF(await file.arrayBuffer())
  const patchFrames = decompressFrames(parsedGif, true)
  const { width, height } = parsedGif.lsd
  const { patchCanvas, patchContext, workingContext } = createRenderSurfaces(width, height)
  const backgroundColor = getBackgroundColor(parsedGif)

  const decodedFrames: GifFrame[] = []
  let previousFrame: ParsedFrame | null = null
  let previousSnapshot: RestoreSnapshot | null = null
  let patchImageData: ImageData | null = null

  paintBackground(workingContext, { left: 0, top: 0, width, height }, backgroundColor)

  for (const frame of patchFrames) {
    disposePreviousFrame(workingContext, previousFrame, previousSnapshot, backgroundColor)
    const restoreTarget = createRestoreSnapshot(workingContext, frame)
    patchImageData = drawFramePatch(workingContext, patchCanvas, patchContext, frame, patchImageData)

    decodedFrames.push({
      delay: normalizeGifDelay(frame.delay),
      imageData: workingContext.getImageData(0, 0, width, height),
    })

    previousFrame = frame
    previousSnapshot = restoreTarget
  }

  return {
    width,
    height,
    frames: decodedFrames,
  }
}

function createRenderSurfaces(width: number, height: number) {
  const workingCanvas = document.createElement('canvas')
  workingCanvas.width = width
  workingCanvas.height = height

  const patchCanvas = document.createElement('canvas')
  const workingContext = workingCanvas.getContext('2d', { willReadFrequently: true })
  const patchContext = patchCanvas.getContext('2d', { willReadFrequently: true })

  if (!workingContext || !patchContext) {
    throw new Error('A 2D canvas context is required to decode GIFs.')
  }

  return { patchCanvas, patchContext, workingContext }
}

function getBackgroundColor(parsedGif: ParsedGif): GifBackgroundColor {
  if (!parsedGif.lsd.gct.exists) {
    return null
  }

  return parsedGif.gct[parsedGif.lsd.backgroundColorIndex] ?? null
}

function disposePreviousFrame(
  workingContext: CanvasRenderingContext2D,
  previousFrame: ParsedFrame | null,
  previousSnapshot: RestoreSnapshot | null,
  backgroundColor: GifBackgroundColor,
): void {
  if (!previousFrame) {
    return
  }

  if (previousFrame.disposalType === 2) {
    paintBackground(workingContext, previousFrame.dims, backgroundColor)
    return
  }

  if (previousFrame.disposalType === 3 && previousSnapshot) {
    workingContext.putImageData(previousSnapshot.imageData, previousSnapshot.dims.left, previousSnapshot.dims.top)
  }
}

function createRestoreSnapshot(workingContext: CanvasRenderingContext2D, frame: ParsedFrame): RestoreSnapshot | null {
  if (frame.disposalType !== 3) {
    return null
  }

  return {
    dims: frame.dims,
    imageData: workingContext.getImageData(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height),
  }
}

function drawFramePatch(
  workingContext: CanvasRenderingContext2D,
  patchCanvas: HTMLCanvasElement,
  patchContext: CanvasRenderingContext2D,
  frame: ParsedFrame,
  patchImageData: ImageData | null,
): ImageData {
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
  workingContext.drawImage(patchCanvas, frame.dims.left, frame.dims.top)

  return patchImageData
}

function paintBackground(
  workingContext: CanvasRenderingContext2D,
  dims: { left: number; top: number; width: number; height: number },
  backgroundColor: GifBackgroundColor,
): void {
  if (!backgroundColor) {
    workingContext.clearRect(dims.left, dims.top, dims.width, dims.height)
    return
  }

  workingContext.fillStyle = `rgb(${backgroundColor[0]} ${backgroundColor[1]} ${backgroundColor[2]})`
  workingContext.fillRect(dims.left, dims.top, dims.width, dims.height)
}
