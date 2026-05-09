import { addTextNodeButtonEl, textNodeControlsEl } from './nodes.ts'
import { createTextNode, nodeSlice, type TextNode } from './state/node-slice.ts'
import { store } from './state/redux.ts'

const textControlRows = new Map<string, HTMLDivElement>()
let previousNodes = store.getState().nodes

if (addTextNodeButtonEl && textNodeControlsEl) {
  addTextNodeButtonEl.addEventListener('click', () => {
    const nodeCount = store.getState().nodes.allIds.length
    const offset = nodeCount * 24

    store.dispatch(
      nodeSlice.actions.upsertTextNode(
        createTextNode({
          left: 120 + offset,
          text: `Text ${nodeCount + 1}`,
          top: 114 + offset,
        }),
      ),
    )
  })

  store.subscribe(() => {
    const state = store.getState()

    if (state.nodes === previousNodes) {
      return
    }

    previousNodes = state.nodes
    syncTextNodeControls()
  })

  syncTextNodeControls()
}

function syncTextNodeControls(): void {
  const { allIds, byId } = store.getState().nodes
  const activeIds = new Set(allIds)

  for (const nodeId of textControlRows.keys()) {
    if (!activeIds.has(nodeId)) {
      const row = textControlRows.get(nodeId)
      row?.remove()
      textControlRows.delete(nodeId)
    }
  }

  const emptyText = textNodeControlsEl.firstChild

  if (emptyText instanceof Text && emptyText.textContent === 'No text overlays yet.') {
    emptyText.remove()
  }

  allIds.forEach((nodeId, index) => {
    const node = byId[nodeId]

    if (!node || node.type !== 'text') {
      return
    }

    let row = textControlRows.get(node.id)

    if (!row) {
      row = createTextNodeRow(node)
      textControlRows.set(node.id, row)
    }

    updateTextNodeRow(row, node, index)
    const currentChild = textNodeControlsEl.children[index]

    if (currentChild !== row) {
      textNodeControlsEl.insertBefore(row, currentChild ?? null)
    }
  })

  textNodeControlsEl.dataset.empty = allIds.length === 0 ? 'true' : 'false'
  if (allIds.length === 0) {
    textNodeControlsEl.textContent = 'No text overlays yet.'
  }
}

function createTextNodeRow(node: TextNode): HTMLDivElement {
  const row = document.createElement('div')
  row.className = 'rounded-xl border border-zinc-200 bg-zinc-50 p-4'
  row.dataset.nodeId = node.id

  const header = document.createElement('div')
  header.className = 'mb-3 flex items-center justify-between gap-3'

  const title = document.createElement('div')
  title.className = 'text-sm font-medium text-zinc-900'
  title.dataset.role = 'title'
  header.append(title)

  const actions = document.createElement('div')
  actions.className = 'flex items-center gap-2'

  const duplicateButton = document.createElement('button')
  duplicateButton.type = 'button'
  duplicateButton.className =
    'rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100'
  duplicateButton.textContent = 'Duplicate'
  duplicateButton.addEventListener('click', () => duplicateTextNode(node.id))
  actions.append(duplicateButton)

  const deleteButton = document.createElement('button')
  deleteButton.type = 'button'
  deleteButton.className =
    'rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50'
  deleteButton.textContent = 'Delete'
  deleteButton.addEventListener('click', () => {
    store.dispatch(nodeSlice.actions.removeNode(node.id))
  })
  actions.append(deleteButton)

  header.append(actions)
  row.append(header)

  const input = document.createElement('input')
  input.type = 'text'
  input.className =
    'block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100'
  input.placeholder = 'Write overlay text'
  input.dataset.role = 'text-input'
  input.addEventListener('input', () => {
    store.dispatch(
      nodeSlice.actions.updateTextNode({
        id: node.id,
        changes: { text: input.value },
      }),
    )
  })
  row.append(input)

  return row
}

function updateTextNodeRow(row: HTMLDivElement, node: TextNode, index: number): void {
  row.dataset.nodeId = node.id

  const title = row.querySelector('[data-role="title"]')
  if (title instanceof HTMLDivElement) {
    title.textContent = `Text ${index + 1}`
  }

  const input = row.querySelector('[data-role="text-input"]')
  if (input instanceof HTMLInputElement && input.value !== node.text) {
    input.value = node.text
  }
}

function duplicateTextNode(nodeId: string): void {
  const node = store.getState().nodes.byId[nodeId]

  if (!node || node.type !== 'text') {
    return
  }

  store.dispatch(
    nodeSlice.actions.upsertTextNode(
      createTextNode({
        fill: node.fill,
        fontSize: node.fontSize,
        left: node.left + 24,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
        text: node.text,
        top: node.top + 24,
      }),
    ),
  )
}
