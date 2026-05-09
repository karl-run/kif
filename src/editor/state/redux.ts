import { configureStore } from '@reduxjs/toolkit'
import { fileSlice } from '@editor/state/file-slice.ts'
import { nodeSlice } from '@editor/state/node-slice.ts'

export const store = configureStore({
  reducer: {
    files: fileSlice.reducer,
    nodes: nodeSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
