import { addTextNodeButtonEl, textNodeControlsEl } from './nodes.ts'
import { selectCanvasTextNode } from './fabric-node-sync.ts'
import { createTextNode, nodeSlice, type TextNode } from './state/node-slice.ts'
import { store } from './state/redux.ts'

type RangeHandle = 'start' | 'end'

const textControlRows = new Map<string, HTMLDivElement>()
let previousNodes = store.getState().nodes
let previousFrameCount = store.getState().files.currentGifFrameCount
let activeRangeDrag:
  | {
      handle: RangeHandle
      nodeId: string
      sliderShell: HTMLDivElement
    }
  | null = null

document.addEventListener('pointermove', (event) => {
  if (!activeRangeDrag) {
    return
  }

  updateRangeFromPointer(activeRangeDrag.nodeId, activeRangeDrag.handle, activeRangeDrag.sliderShell, event.clientX)
})

document.addEventListener('pointerup', stopRangeDrag)
document.addEventListener('pointercancel', stopRangeDrag)

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

    if (state.nodes === previousNodes && state.files.currentGifFrameCount === previousFrameCount) {
      return
    }

    previousNodes = state.nodes
    previousFrameCount = state.files.currentGifFrameCount
    syncTextNodeControls()
  })

  syncTextNodeControls()
}

function syncTextNodeControls(): void {
  const state = store.getState()
  const { allIds, byId } = state.nodes
  const activeIds = new Set(allIds)
  const frameCount = state.files.currentGifFrameCount

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

    updateTextNodeRow(row, node, index, frameCount)
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
  input.addEventListener('focus', () => {
    selectCanvasTextNode(node.id)
  })
  input.addEventListener('input', () => {
    selectCanvasTextNode(node.id)
    store.dispatch(
      nodeSlice.actions.updateTextNode({
        id: node.id,
        changes: { text: input.value },
      }),
    )
  })
  row.append(input)

  const visibilitySection = document.createElement('div')
  visibilitySection.className = 'mt-3 space-y-2'

  const visibilityHeader = document.createElement('div')
  visibilityHeader.className = 'flex items-center justify-between gap-3'

  const visibilityLabel = document.createElement('div')
  visibilityLabel.className = 'text-xs font-medium uppercase tracking-wide text-zinc-500'
  visibilityLabel.textContent = 'Visible range'
  visibilityHeader.append(visibilityLabel)

  const visibilityValue = document.createElement('div')
  visibilityValue.className = 'text-xs text-zinc-600'
  visibilityValue.dataset.role = 'visibility-value'
  visibilityHeader.append(visibilityValue)

  visibilitySection.append(visibilityHeader)

  const sliderShell = document.createElement('div')
  sliderShell.className = 'relative h-9 touch-none'

  const sliderTrack = document.createElement('div')
  sliderTrack.className = 'absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-200'
  sliderShell.append(sliderTrack)

  const sliderFill = document.createElement('div')
  sliderFill.className = 'absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-sky-400'
  sliderFill.dataset.role = 'visibility-fill'
  sliderShell.append(sliderFill)

  const startHandle = document.createElement('button')
  startHandle.type = 'button'
  startHandle.className =
    'absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-500 bg-white shadow-sm'
  startHandle.setAttribute('aria-label', 'Start of visible range')
  startHandle.dataset.role = 'visibility-start-handle'
  startHandle.addEventListener('pointerdown', (event) => {
    beginRangeDrag(node.id, 'start', sliderShell, event)
  })
  sliderShell.append(startHandle)

  const endHandle = document.createElement('button')
  endHandle.type = 'button'
  endHandle.className =
    'absolute top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-500 bg-white shadow-sm'
  endHandle.setAttribute('aria-label', 'End of visible range')
  endHandle.dataset.role = 'visibility-end-handle'
  endHandle.addEventListener('pointerdown', (event) => {
    beginRangeDrag(node.id, 'end', sliderShell, event)
  })
  sliderShell.append(endHandle)

  visibilitySection.append(sliderShell)
  row.append(visibilitySection)

  return row
}

function updateTextNodeRow(row: HTMLDivElement, node: TextNode, index: number, frameCount: number): void {
  row.dataset.nodeId = node.id

  const title = row.querySelector('[data-role="title"]')
  if (title instanceof HTMLDivElement) {
    title.textContent = `Text ${index + 1}`
  }

  const input = row.querySelector('[data-role="text-input"]')
  if (input instanceof HTMLInputElement && input.value !== node.text) {
    input.value = node.text
  }

  const startHandle = row.querySelector('[data-role="visibility-start-handle"]')
  if (startHandle instanceof HTMLButtonElement) {
    startHandle.style.left = `${clampPercent(node.visibleRangeStart * 100)}%`
    startHandle.disabled = frameCount <= 1
    startHandle.style.opacity = frameCount > 1 ? '1' : '0.5'
  }

  const endHandle = row.querySelector('[data-role="visibility-end-handle"]')
  if (endHandle instanceof HTMLButtonElement) {
    endHandle.style.left = `${clampPercent(node.visibleRangeEnd * 100)}%`
    endHandle.disabled = frameCount <= 1
    endHandle.style.opacity = frameCount > 1 ? '1' : '0.5'
  }

  const visibilityFill = row.querySelector('[data-role="visibility-fill"]')
  if (visibilityFill instanceof HTMLDivElement) {
    const startPercent = clampPercent(node.visibleRangeStart * 100)
    const endPercent = clampPercent(node.visibleRangeEnd * 100)
    visibilityFill.style.left = `${startPercent}%`
    visibilityFill.style.width = `${Math.max(endPercent - startPercent, 0)}%`
  }

  const visibilityValue = row.querySelector('[data-role="visibility-value"]')
  if (visibilityValue instanceof HTMLDivElement) {
    visibilityValue.textContent =
      frameCount > 1
        ? `Frames ${formatFrameIndex(node.visibleRangeStart, frameCount)}-${formatFrameIndex(node.visibleRangeEnd, frameCount)}`
        : 'Load a GIF to set visibility'
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
        angle: node.angle,
        fill: node.fill,
        fontSize: node.fontSize,
        left: node.left + 24,
        scaleX: node.scaleX,
        scaleY: node.scaleY,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
        text: node.text,
        top: node.top + 24,
        visibleRangeEnd: node.visibleRangeEnd,
        visibleRangeStart: node.visibleRangeStart,
      }),
    ),
  )
}

function beginRangeDrag(nodeId: string, handle: RangeHandle, sliderShell: HTMLDivElement, event: PointerEvent): void {
  if (store.getState().files.currentGifFrameCount <= 1) {
    return
  }

  selectCanvasTextNode(nodeId)
  activeRangeDrag = { handle, nodeId, sliderShell }
  event.preventDefault()
  updateRangeFromPointer(nodeId, handle, sliderShell, event.clientX)
}

function updateRangeFromPointer(nodeId: string, handle: RangeHandle, sliderShell: HTMLDivElement, clientX: number): void {
  const node = getTextNode(nodeId)

  if (!node) {
    activeRangeDrag = null
    return
  }

  const sliderBounds = sliderShell.getBoundingClientRect()

  if (sliderBounds.width <= 0) {
    return
  }

  const nextValue = Math.min(1, Math.max(0, (clientX - sliderBounds.left) / sliderBounds.width))

  store.dispatch(
    nodeSlice.actions.updateTextNode({
      id: nodeId,
      changes:
        handle === 'start'
          ? {
              visibleRangeStart: Math.min(nextValue, node.visibleRangeEnd),
            }
          : {
              visibleRangeEnd: Math.max(nextValue, node.visibleRangeStart),
            },
    }),
  )
}

function stopRangeDrag(): void {
  activeRangeDrag = null
}

function getTextNode(nodeId: string): TextNode | null {
  const node = store.getState().nodes.byId[nodeId]

  return node && node.type === 'text' ? node : null
}

function normalizePercent(value: number): number {
  return clampPercent(value) / 100
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function formatFrameIndex(rangeValue: number, frameCount: number): number {
  return Math.round(clampPercent(rangeValue * 100) / 100 * (frameCount - 1)) + 1
}
