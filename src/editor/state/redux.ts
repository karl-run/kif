import { configureStore } from '@reduxjs/toolkit'
import type { CounterState } from '@editor/state/file-slice.ts'
import { fileSlice } from '@editor/state/file-slice.ts'
import type { NodeState } from '@editor/state/node-slice.ts'
import { nodeSlice } from '@editor/state/node-slice.ts'

const LOCAL_STORAGE_KEY = 'kif-editor-state'
const PERSISTED_STATE_VERSION = 1

type PersistedState = {
  version: number
  files: Pick<CounterState, 'currentFile' | 'fileHistory'>
  nodes: NodeState
}

function loadPersistedState():
  | {
      files: CounterState
      nodes: NodeState
    }
  | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const serializedState = window.localStorage.getItem(LOCAL_STORAGE_KEY)

  if (!serializedState) {
    return undefined
  }

  try {
    const parsedState = JSON.parse(serializedState) as Partial<PersistedState>

    if (parsedState.version !== PERSISTED_STATE_VERSION) {
      return undefined
    }

    const initialFilesState = fileSlice.getInitialState()
    const initialNodesState = nodeSlice.getInitialState()

    return {
      files: {
        ...initialFilesState,
        currentFile: parsedState.files?.currentFile ?? initialFilesState.currentFile,
        fileHistory: parsedState.files?.fileHistory ?? initialFilesState.fileHistory,
      },
      nodes: parsedState.nodes ?? initialNodesState,
    }
  } catch (error) {
    console.error('Failed to restore editor state from localStorage.', error)
    return undefined
  }
}

export const store = configureStore({
  preloadedState: loadPersistedState(),
  reducer: {
    files: fileSlice.reducer,
    nodes: nodeSlice.reducer,
  },
})

let previousSerializedState = ''

store.subscribe(() => {
  if (typeof window === 'undefined') {
    return
  }

  const state = store.getState()
  const serializedState = JSON.stringify({
    version: PERSISTED_STATE_VERSION,
    files: {
      currentFile: state.files.currentFile,
      fileHistory: state.files.fileHistory,
    },
    nodes: state.nodes,
  } satisfies PersistedState)

  if (serializedState === previousSerializedState) {
    return
  }

  previousSerializedState = serializedState

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, serializedState)
  } catch (error) {
    console.error('Failed to persist editor state to localStorage.', error)
  }
})

export type AppStore = typeof store
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
