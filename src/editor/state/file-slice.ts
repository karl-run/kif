import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { StoredFile } from './file.ts'

export interface CounterState {
  currentFile: StoredFile | null
}

const initialState: CounterState = {
  currentFile: null,
}

export const fileSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    file: (state, action: PayloadAction<StoredFile | null>) => {
      const nextFile = action.payload
      if (!nextFile) {
        state.currentFile = null
        return
      }

      if (state.currentFile?.id === nextFile.id) return

      state.currentFile = nextFile
    },
    fileDetails: (state, action: PayloadAction<{ frameCount: number; height: number; id: string; width: number }>) => {
      if (!state.currentFile || state.currentFile.id !== action.payload.id) {
        return
      }

      state.currentFile.frameCount = action.payload.frameCount
      state.currentFile.height = action.payload.height
      state.currentFile.width = action.payload.width
    },
  },
})
