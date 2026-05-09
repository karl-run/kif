import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { FileRef } from './file-registry.ts'

export interface CounterState {
  currentFile: FileRef | null
  currentGifFrameCount: number
  fileHistory: Array<FileRef | null>
}

const initialState: CounterState = {
  currentFile: null,
  currentGifFrameCount: 0,
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
        return
      }

      if (state.currentFile?.id === nextFile.id) return

      state.fileHistory = state.fileHistory.filter((file) => file?.id !== nextFile.id)
      if (state.currentFile) {
        state.fileHistory.push(state.currentFile)
      }

      state.currentFile = nextFile
      state.currentGifFrameCount = 0
    },
    gifFrameCount: (state, action: PayloadAction<number>) => {
      state.currentGifFrameCount = action.payload
    },
  },
})
