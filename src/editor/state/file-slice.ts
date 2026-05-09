import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { FileRef } from './file-registry.ts'

export interface CounterState {
  currentFile: FileRef | null
  currentGifFrameCount: number
  currentPreviewFrameIndex: number
  isPreviewPlaying: boolean
  fileHistory: Array<FileRef | null>
}

const initialState: CounterState = {
  currentFile: null,
  currentGifFrameCount: 0,
  currentPreviewFrameIndex: 0,
  isPreviewPlaying: false,
  fileHistory: [],
}

export const fileSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    file: (state, action: PayloadAction<FileRef | null>) => {
      const nextFile = action.payload
      if (!nextFile) {
        state.currentFile = null
        state.currentGifFrameCount = 0
        state.currentPreviewFrameIndex = 0
        state.isPreviewPlaying = false
        return
      }

      if (state.currentFile?.id === nextFile.id) return

      state.fileHistory = state.fileHistory.filter((file) => file?.id !== nextFile.id)
      if (state.currentFile) {
        state.fileHistory.push(state.currentFile)
      }

      state.currentFile = nextFile
      state.currentGifFrameCount = 0
      state.currentPreviewFrameIndex = 0
      state.isPreviewPlaying = false
    },
    gifFrameCount: (state, action: PayloadAction<number>) => {
      state.currentGifFrameCount = action.payload
      if (action.payload <= 0) {
        state.currentPreviewFrameIndex = 0
      } else if (state.currentPreviewFrameIndex >= action.payload) {
        state.currentPreviewFrameIndex = action.payload - 1
      }
    },
    previewFrameIndex: (state, action: PayloadAction<number>) => {
      if (state.currentGifFrameCount <= 0) {
        state.currentPreviewFrameIndex = 0
        return
      }

      state.currentPreviewFrameIndex = Math.min(Math.max(action.payload, 0), state.currentGifFrameCount - 1)
    },
    previewPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPreviewPlaying = action.payload && state.currentGifFrameCount > 0
    },
  },
})
