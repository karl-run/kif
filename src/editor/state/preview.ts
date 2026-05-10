import { get, writable } from 'svelte/store'

export type PreviewStoreState = {
  currentGifFrameCount: number
  currentPreviewFrameIndex: number
  isPreviewPlaying: boolean
}

const initialState: PreviewStoreState = {
  currentGifFrameCount: 0,
  currentPreviewFrameIndex: 0,
  isPreviewPlaying: false,
}

const store = writable<PreviewStoreState>(initialState)

export const previewStore = {
  subscribe: store.subscribe,
}

export const getPreviewState = (): PreviewStoreState => get(store)

export const resetPreviewState = (): void => {
  store.set(initialState)
}

export const setPreviewFrameCount = (frameCount: number): void => {
  store.update((state) => {
    if (frameCount <= 0) {
      return {
        currentGifFrameCount: 0,
        currentPreviewFrameIndex: 0,
        isPreviewPlaying: false,
      }
    }

    return {
      ...state,
      currentGifFrameCount: frameCount,
      currentPreviewFrameIndex: Math.min(state.currentPreviewFrameIndex, frameCount - 1),
    }
  })
}

export const setPreviewFrameIndex = (frameIndex: number): void => {
  store.update((state) => {
    if (state.currentGifFrameCount <= 0) {
      return {
        ...state,
        currentPreviewFrameIndex: 0,
      }
    }

    return {
      ...state,
      currentPreviewFrameIndex: Math.min(Math.max(frameIndex, 0), state.currentGifFrameCount - 1),
    }
  })
}

export const setPreviewPlaying = (isPlaying: boolean): void => {
  store.update((state) => ({
    ...state,
    isPreviewPlaying: isPlaying && state.currentGifFrameCount > 0,
  }))
}
