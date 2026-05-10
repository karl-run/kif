import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import { getFileSignature } from './file.ts'

export interface CounterState {
  currentFile: File | null
}

const initialState: CounterState = {
  currentFile: null,
}

export const fileSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    file: (state, action: PayloadAction<File | null>) => {
      const nextFile = action.payload
      if (!nextFile) {
        state.currentFile = null
        return
      }

      if (state.currentFile && getFileSignature(state.currentFile) === getFileSignature(nextFile)) return

      state.currentFile = nextFile
    },
  },
})
