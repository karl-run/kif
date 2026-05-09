import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface TextNode {
  id: string
  type: 'text'
  text: string
  left: number
  top: number
  fontSize: number
  fill: string
  stroke: string | null
  strokeWidth: number
}

export type EditorNode = TextNode

export interface NodeState {
  allIds: string[]
  byId: Record<string, EditorNode>
}

export const defaultTextNode: TextNode = {
  id: 'default-text-node',
  type: 'text',
  text: 'Hello world!',
  left: 24,
  top: 24,
  fontSize: 40,
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 2,
}

const initialState: NodeState = {
  allIds: [defaultTextNode.id],
  byId: {
    [defaultTextNode.id]: defaultTextNode,
  },
}

export const nodeSlice = createSlice({
  name: 'nodes',
  initialState,
  reducers: {
    upsertTextNode: (state, action: PayloadAction<TextNode>) => {
      const node = action.payload

      if (!state.byId[node.id]) {
        state.allIds.push(node.id)
      }

      state.byId[node.id] = node
    },
    updateTextNode: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<Omit<TextNode, 'id' | 'type'>> }>,
    ) => {
      const existingNode = state.byId[action.payload.id]

      if (!existingNode || existingNode.type !== 'text') {
        return
      }

      state.byId[action.payload.id] = {
        ...existingNode,
        ...action.payload.changes,
      }
    },
    removeNode: (state, action: PayloadAction<string>) => {
      const id = action.payload

      if (!state.byId[id]) {
        return
      }

      delete state.byId[id]
      state.allIds = state.allIds.filter((nodeId) => nodeId !== id)
    },
    clearNodes: (state) => {
      state.byId = {}
      state.allIds = []
    },
  },
})
