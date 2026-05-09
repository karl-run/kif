import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js'

export type GifFrame = {
  delay: number
  imageData: ImageData
}

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

  const workingContext = workingCanvas.getContext('2d', { willReadFrequently: true })

  if (!workingContext) {
    throw new Error('A 2D canvas context is required to decode GIFs.')
  }

  const decodedFrames: GifFrame[] = []
  let previousDisposal = 0
  let previousPatchDims: ParsedFrame['dims'] | null = null
  let previousSnapshot: ImageData | null = null

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

    workingContext.putImageData(
      new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height),
      frame.dims.left,
      frame.dims.top,
    )

    decodedFrames.push({
      delay: frame.delay,
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
