import { get, writable } from 'svelte/store'

export type PreviewStoreState = {
  currentPreviewFrameIndex: number
  isPreviewPlaying: boolean
}

const initialState: PreviewStoreState = {
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

export const setPreviewFrameIndex = (frameIndex: number, frameCount: number): void => {
  store.update((state) => {
    if (frameCount <= 0) {
      return {
        ...state,
        currentPreviewFrameIndex: 0,
      }
    }

    return {
      ...state,
      currentPreviewFrameIndex: Math.min(Math.max(frameIndex, 0), frameCount - 1),
    }
  })
}

export const setPreviewPlaying = (isPlaying: boolean, frameCount: number): void => {
  store.update((state) => ({
    ...state,
    isPreviewPlaying: isPlaying && frameCount > 0,
  }))
}
