import { configureStore } from '@reduxjs/toolkit'
import { fileSlice } from '@editor/state/file-slice.ts'

export const store = configureStore({
  reducer: {
    files: fileSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
