export type GifFrame = {
  delay: number
  imageData: ImageData
}

export type DecodedGif = {
  frames: GifFrame[]
  height: number
  width: number
}
