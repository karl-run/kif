import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface TextNode {
  angle: number
  id: string
  type: 'text'
  text: string
  left: number
  scaleX: number
  scaleY: number
  top: number
  visibleRangeEnd: number
  visibleRangeStart: number
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

function createTextNodeId(): string {
  return crypto.randomUUID()
}

export function createTextNode(overrides: Partial<Omit<TextNode, 'id' | 'type'>> = {}, id = createTextNodeId()): TextNode {
  return {
    angle: 0,
    id,
    type: 'text',
    text: 'Hello, Kif!',
    left: 120,
    scaleX: 1,
    scaleY: 1,
    top: 114,
    visibleRangeEnd: 1,
    visibleRangeStart: 0,
    fontSize: 50,
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    ...overrides,
  }
}

export const defaultTextNode: TextNode = createTextNode({}, 'default-text-node')

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
