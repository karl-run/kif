declare module 'gifenc' {
  export type GifColor = [number, number, number] | [number, number, number, number]
  export type GifPalette = GifColor[]
  export type GifColorFormat = 'rgb565' | 'rgb444' | 'rgba4444'

  export interface QuantizeOptions {
    clearAlpha?: boolean
    clearAlphaColor?: number
    clearAlphaThreshold?: number
    format?: GifColorFormat
    oneBitAlpha?: boolean | number
  }

  export interface WriteFrameOptions {
    colorDepth?: number
    delay?: number
    dispose?: number
    palette?: GifPalette | null
    repeat?: number
    transparent?: boolean
    transparentIndex?: number
  }

  export interface GifEncoderStream {
    bytes(): Uint8Array
    finish(): void
    reset(): void
    writeFrame(index: Uint8Array, width: number, height: number, options?: WriteFrameOptions): void
    writeHeader(): void
  }

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GifEncoderStream
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GifPalette,
    format?: GifColorFormat,
  ): Uint8Array
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions,
  ): GifPalette

  export default GIFEncoder
}
