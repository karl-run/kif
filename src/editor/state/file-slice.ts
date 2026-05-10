import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { FileRef } from './file-registry.ts'

export interface CounterState {
  currentFile: FileRef | null
}

const initialState: CounterState = {
  currentFile: null,
}

export const fileSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    file: (state, action: PayloadAction<FileRef | null>) => {
      const nextFile = action.payload
      if (!nextFile) {
        state.currentFile = null
        return
      }

      if (state.currentFile?.id === nextFile.id) return

      state.currentFile = nextFile
    },
  },
})
