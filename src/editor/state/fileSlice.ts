import { createSlice } from '@reduxjs/toolkit'

export interface CounterState {
  currentFile: unknown | null
  fileHistory: unknown[]
}

const initialState: CounterState = {
  currentFile: null,
  fileHistory: [],
}

export const fileSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    file: (state, payload: unknown ) => {
      state.fileHistory.push(state.currentFile)
      state.currentFile = payload
    },
  },
})
