import { derived, readable, type Readable } from 'svelte/store'

import { store, type RootState } from './redux.ts'

export const appState = readable(store.getState(), (set) => {
  set(store.getState())
  return store.subscribe(() => {
    set(store.getState())
  })
})

export const dispatch = store.dispatch

export const selectState = <Selected>(selector: (state: RootState) => Selected): Readable<Selected> =>
  derived(appState, ($appState) => selector($appState))
