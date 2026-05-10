import { overlayNodeControlsEl } from './nodes.ts'
import { selectCanvasNode } from './fabric-node-sync.ts'
import {
  createPictureNode,
  createTextNode,
  nodeSlice,
  type EditorNode,
  type PictureNode,
  type TextNode,
} from './state/node-slice.ts'
import { pickPictureFile, readFileAsDataUrl } from './picture-picker.ts'
import { store } from './state/redux.ts'

type RangeHandle = 'start' | 'end'

const nodeControlRows = new Map<string, HTMLDivElement>()
let previousNodes = store.getState().nodes
let previousFrameCount = store.getState().files.currentGifFrameCount
let activeRangeDrag: {
  handle: RangeHandle
  nodeId: string
  sliderShell: HTMLDivElement
} | null = null

document.addEventListener('pointermove', (event) => {
  if (!activeRangeDrag) {
    return
  }

  updateRangeFromPointer(activeRangeDrag.nodeId, activeRangeDrag.handle, activeRangeDrag.sliderShell, event.clientX)
})

document.addEventListener('pointerup', stopRangeDrag)
document.addEventListener('pointercancel', stopRangeDrag)

if (overlayNodeControlsEl) {
  store.subscribe(() => {
    const state = store.getState()

    if (state.nodes === previousNodes && state.files.currentGifFrameCount === previousFrameCount) {
      return
    }

    previousNodes = state.nodes
    previousFrameCount = state.files.currentGifFrameCount
    syncNodeControls()
  })

  syncNodeControls()
}

function syncNodeControls(): void {
  if (!overlayNodeControlsEl) {
    return
  }

  const state = store.getState()
  const { allIds, byId } = state.nodes
  const activeIds = new Set(allIds)
  const frameCount = state.files.currentGifFrameCount
  let textCount = 0
  let pictureCount = 0

  for (const nodeId of nodeControlRows.keys()) {
    if (!activeIds.has(nodeId)) {
      const row = nodeControlRows.get(nodeId)
      row?.remove()
      nodeControlRows.delete(nodeId)
    }
  }

  const emptyText = overlayNodeControlsEl.firstChild

  if (emptyText instanceof Text && emptyText.textContent === 'No overlays yet.') {
    emptyText.remove()
  }

  allIds.forEach((nodeId, index) => {
    const node = byId[nodeId]

    if (!node) {
      return
    }

    const typeIndex = node.type === 'text' ? ++textCount : ++pictureCount

    let row = nodeControlRows.get(node.id)

    if (!row) {
      row = node.type === 'text' ? createTextNodeRow(node) : createPictureNodeRow(node)
      nodeControlRows.set(node.id, row)
    }

    if (node.type === 'text') {
      updateTextNodeRow(row, node, typeIndex, frameCount)
    } else {
      updatePictureNodeRow(row, node, typeIndex, frameCount)
    }

    const currentChild = overlayNodeControlsEl.children[index]

    if (currentChild !== row) {
      overlayNodeControlsEl.insertBefore(row, currentChild ?? null)
    }
  })

  overlayNodeControlsEl.dataset.empty = allIds.length === 0 ? 'true' : 'false'
  if (allIds.length === 0) {
    overlayNodeControlsEl.textContent = 'No overlays yet.'
  }
}

function createTextNodeRow(node: TextNode): HTMLDivElement {
  const row = createBaseNodeRow(node.id)

  const input = document.createElement('input')
  input.type = 'text'
  input.className =
    'block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-sky-950'
  input.placeholder = 'Write overlay text'
  input.dataset.role = 'text-input'
  input.addEventListener('focus', () => {
    selectCanvasNode(node.id)
  })
  input.addEventListener('input', () => {
    selectCanvasNode(node.id)
    store.dispatch(
      nodeSlice.actions.updateTextNode({
        id: node.id,
        changes: { text: input.value },
      }),
    )
  })
  row.append(input)
  row.append(createVisibilitySection(node.id))

  return row
}

function createPictureNodeRow(node: PictureNode): HTMLDivElement {
  const row = createBaseNodeRow(node.id)

  const content = document.createElement('div')
  content.className = 'space-y-3'

  const previewShell = document.createElement('div')
  previewShell.className =
    'flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950'

  const previewImage = document.createElement('img')
  previewImage.className =
    'h-16 w-16 rounded-md border border-zinc-200 bg-zinc-100 object-contain dark:border-zinc-700 dark:bg-zinc-900'
  previewImage.alt = ''
  previewImage.dataset.role = 'picture-preview'
  previewShell.append(previewImage)

  const previewMeta = document.createElement('div')
  previewMeta.className = 'min-w-0 flex-1 space-y-2'

  const pictureName = document.createElement('div')
  pictureName.className = 'truncate text-sm font-medium text-zinc-900 dark:text-zinc-100'
  pictureName.dataset.role = 'picture-name'
  previewMeta.append(pictureName)

  const replaceButton = document.createElement('button')
  replaceButton.type = 'button'
  replaceButton.className =
    'rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
  replaceButton.textContent = 'Replace image'
  replaceButton.addEventListener('click', () => {
    selectCanvasNode(node.id)
    void replacePictureNodeFromPicker(node.id)
  })
  previewMeta.append(replaceButton)

  previewShell.append(previewMeta)
  content.append(previewShell)
  row.append(content)
  row.append(createVisibilitySection(node.id))

  return row
}

function createBaseNodeRow(nodeId: string): HTMLDivElement {
  const row = document.createElement('div')
  row.className = 'rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950'
  row.dataset.nodeId = nodeId

  const header = document.createElement('div')
  header.className = 'mb-3 flex items-center justify-between gap-3'

  const title = document.createElement('div')
  title.className = 'text-sm font-medium text-zinc-900 dark:text-zinc-100'
  title.dataset.role = 'title'
  header.append(title)

  const actions = document.createElement('div')
  actions.className = 'flex items-center gap-2'

  const duplicateButton = document.createElement('button')
  duplicateButton.type = 'button'
  duplicateButton.className =
    'rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
  duplicateButton.textContent = 'Duplicate'
  duplicateButton.addEventListener('click', () => duplicateNode(nodeId))
  actions.append(duplicateButton)

  const deleteButton = document.createElement('button')
  deleteButton.type = 'button'
  deleteButton.className =
    'rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-950/40'
  deleteButton.textContent = 'Delete'
  deleteButton.addEventListener('click', () => {
    store.dispatch(nodeSlice.actions.removeNode(nodeId))
  })
  actions.append(deleteButton)

  header.append(actions)
  row.append(header)

  return row
}

function createVisibilitySection(nodeId: string): HTMLDivElement {
  const visibilitySection = document.createElement('div')
  visibilitySection.className = 'mt-3 space-y-2'

  const visibilityHeader = document.createElement('div')
  visibilityHeader.className = 'flex items-center justify-between gap-3'

  const visibilityLabel = document.createElement('div')
  visibilityLabel.className = 'text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400'
  visibilityLabel.textContent = 'Visible range'
  visibilityHeader.append(visibilityLabel)

  const visibilityValue = document.createElement('div')
  visibilityValue.className = 'text-xs text-zinc-600 dark:text-zinc-400'
  visibilityValue.dataset.role = 'visibility-value'
  visibilityHeader.append(visibilityValue)

  visibilitySection.append(visibilityHeader)

  const sliderShell = document.createElement('div')
  sliderShell.className = 'relative h-9 touch-none'

  const sliderTrack = document.createElement('div')
  sliderTrack.className = 'absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-200 dark:bg-zinc-800'
  sliderShell.append(sliderTrack)

  const sliderFill = document.createElement('div')
  sliderFill.className = 'absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-sky-400'
  sliderFill.dataset.role = 'visibility-fill'
  sliderShell.append(sliderFill)

  const startHandle = document.createElement('button')
  startHandle.type = 'button'
  startHandle.className =
    'absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-500 bg-white shadow-sm dark:bg-zinc-950'
  startHandle.setAttribute('aria-label', 'Start of visible range')
  startHandle.dataset.role = 'visibility-start-handle'
  startHandle.addEventListener('pointerdown', (event) => {
    beginRangeDrag(nodeId, 'start', sliderShell, event)
  })
  sliderShell.append(startHandle)

  const endHandle = document.createElement('button')
  endHandle.type = 'button'
  endHandle.className =
    'absolute top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-500 bg-white shadow-sm dark:bg-zinc-950'
  endHandle.setAttribute('aria-label', 'End of visible range')
  endHandle.dataset.role = 'visibility-end-handle'
  endHandle.addEventListener('pointerdown', (event) => {
    beginRangeDrag(nodeId, 'end', sliderShell, event)
  })
  sliderShell.append(endHandle)

  visibilitySection.append(sliderShell)

  const snapActions = document.createElement('div')
  snapActions.className = 'flex items-center justify-between gap-3'

  const snapStartButton = document.createElement('button')
  snapStartButton.type = 'button'
  snapStartButton.className =
    'rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:disabled:text-zinc-600'
  snapStartButton.textContent = 'Set start to current'
  snapStartButton.dataset.role = 'visibility-set-start'
  snapStartButton.addEventListener('click', () => {
    snapVisibleRangeToCurrentFrame(nodeId, 'start')
  })
  snapActions.append(snapStartButton)

  const snapEndButton = document.createElement('button')
  snapEndButton.type = 'button'
  snapEndButton.className =
    'rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:disabled:text-zinc-600'
  snapEndButton.textContent = 'Set end to current'
  snapEndButton.dataset.role = 'visibility-set-end'
  snapEndButton.addEventListener('click', () => {
    snapVisibleRangeToCurrentFrame(nodeId, 'end')
  })
  snapActions.append(snapEndButton)

  visibilitySection.append(snapActions)

  return visibilitySection
}

function updateTextNodeRow(row: HTMLDivElement, node: TextNode, index: number, frameCount: number): void {
  row.dataset.nodeId = node.id

  const title = row.querySelector('[data-role="title"]')
  if (title instanceof HTMLDivElement) {
    title.textContent = `Text ${index}`
  }

  const input = row.querySelector('[data-role="text-input"]')
  if (input instanceof HTMLInputElement && input.value !== node.text) {
    input.value = node.text
  }

  updateVisibilityControls(row, node, frameCount)
}

function updatePictureNodeRow(row: HTMLDivElement, node: PictureNode, index: number, frameCount: number): void {
  row.dataset.nodeId = node.id

  const title = row.querySelector('[data-role="title"]')
  if (title instanceof HTMLDivElement) {
    title.textContent = `Picture ${index}`
  }

  const pictureName = row.querySelector('[data-role="picture-name"]')
  if (pictureName instanceof HTMLDivElement) {
    pictureName.textContent = node.name || 'Image'
  }

  const picturePreview = row.querySelector('[data-role="picture-preview"]')
  if (picturePreview instanceof HTMLImageElement) {
    if (node.src) {
      picturePreview.src = node.src
      picturePreview.style.visibility = 'visible'
    } else {
      picturePreview.removeAttribute('src')
      picturePreview.style.visibility = 'hidden'
    }
  }

  updateVisibilityControls(row, node, frameCount)
}

function updateVisibilityControls(row: HTMLDivElement, node: EditorNode, frameCount: number): void {
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

  const snapStartButton = row.querySelector('[data-role="visibility-set-start"]')
  if (snapStartButton instanceof HTMLButtonElement) {
    snapStartButton.disabled = frameCount <= 1
  }

  const snapEndButton = row.querySelector('[data-role="visibility-set-end"]')
  if (snapEndButton instanceof HTMLButtonElement) {
    snapEndButton.disabled = frameCount <= 1
  }
}

function duplicateNode(nodeId: string): void {
  const node = getNode(nodeId)

  if (!node) {
    return
  }

  switch (node.type) {
    case 'picture':
      store.dispatch(
        nodeSlice.actions.upsertPictureNode(
          createPictureNode({
            angle: node.angle,
            left: node.left + 24,
            name: node.name,
            scaleX: node.scaleX,
            scaleY: node.scaleY,
            src: node.src,
            top: node.top + 24,
            visibleRangeEnd: node.visibleRangeEnd,
            visibleRangeStart: node.visibleRangeStart,
          }),
        ),
      )
      break
    case 'text':
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
      break
  }
}

function beginRangeDrag(nodeId: string, handle: RangeHandle, sliderShell: HTMLDivElement, event: PointerEvent): void {
  if (store.getState().files.currentGifFrameCount <= 1) {
    return
  }

  selectCanvasNode(nodeId)
  activeRangeDrag = { handle, nodeId, sliderShell }
  event.preventDefault()
  updateRangeFromPointer(nodeId, handle, sliderShell, event.clientX)
}

function updateRangeFromPointer(
  nodeId: string,
  handle: RangeHandle,
  sliderShell: HTMLDivElement,
  clientX: number,
): void {
  const node = getNode(nodeId)

  if (!node) {
    activeRangeDrag = null
    return
  }

  const sliderBounds = sliderShell.getBoundingClientRect()

  if (sliderBounds.width <= 0) {
    return
  }

  const nextValue = Math.min(1, Math.max(0, (clientX - sliderBounds.left) / sliderBounds.width))

  switch (node.type) {
    case 'picture':
      store.dispatch(
        nodeSlice.actions.updatePictureNode({
          id: nodeId,
          changes:
            handle === 'start'
              ? { visibleRangeStart: Math.min(nextValue, node.visibleRangeEnd) }
              : { visibleRangeEnd: Math.max(nextValue, node.visibleRangeStart) },
        }),
      )
      break
    case 'text':
      store.dispatch(
        nodeSlice.actions.updateTextNode({
          id: nodeId,
          changes:
            handle === 'start'
              ? { visibleRangeStart: Math.min(nextValue, node.visibleRangeEnd) }
              : { visibleRangeEnd: Math.max(nextValue, node.visibleRangeStart) },
        }),
      )
      break
  }
}

function stopRangeDrag(): void {
  activeRangeDrag = null
}

function snapVisibleRangeToCurrentFrame(nodeId: string, edge: RangeHandle): void {
  const node = getNode(nodeId)
  const { currentGifFrameCount, currentPreviewFrameIndex } = store.getState().files

  if (!node || currentGifFrameCount <= 1) {
    return
  }

  selectCanvasNode(nodeId)

  const currentFrameValue = currentPreviewFrameIndex / (currentGifFrameCount - 1)

  switch (node.type) {
    case 'picture':
      store.dispatch(
        nodeSlice.actions.updatePictureNode({
          id: nodeId,
          changes:
            edge === 'start'
              ? {
                  visibleRangeEnd: Math.max(currentFrameValue, node.visibleRangeEnd),
                  visibleRangeStart: currentFrameValue,
                }
              : {
                  visibleRangeEnd: currentFrameValue,
                  visibleRangeStart: Math.min(node.visibleRangeStart, currentFrameValue),
                },
        }),
      )
      break
    case 'text':
      store.dispatch(
        nodeSlice.actions.updateTextNode({
          id: nodeId,
          changes:
            edge === 'start'
              ? {
                  visibleRangeEnd: Math.max(currentFrameValue, node.visibleRangeEnd),
                  visibleRangeStart: currentFrameValue,
                }
              : {
                  visibleRangeEnd: currentFrameValue,
                  visibleRangeStart: Math.min(node.visibleRangeStart, currentFrameValue),
                },
        }),
      )
      break
  }
}

function getNode(nodeId: string): EditorNode | null {
  return store.getState().nodes.byId[nodeId] ?? null
}

async function createPictureNodeFromPicker(): Promise<void> {
  const file = await pickPictureFile()

  if (!file) {
    return
  }

  const nodeCount = store.getState().nodes.allIds.length
  const offset = nodeCount * 24

  store.dispatch(
    nodeSlice.actions.upsertPictureNode(
      createPictureNode({
        left: 120 + offset,
        name: file.name,
        src: await readFileAsDataUrl(file),
        top: 114 + offset,
      }),
    ),
  )
}

async function replacePictureNodeFromPicker(nodeId: string): Promise<void> {
  const node = getNode(nodeId)

  if (!node || node.type !== 'picture') {
    return
  }

  const file = await pickPictureFile()

  if (!file) {
    return
  }

  store.dispatch(
    nodeSlice.actions.updatePictureNode({
      id: nodeId,
      changes: {
        name: file.name,
        src: await readFileAsDataUrl(file),
      },
    }),
  )
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function formatFrameIndex(rangeValue: number, frameCount: number): number {
  return Math.round((clampPercent(rangeValue * 100) / 100) * (frameCount - 1)) + 1
}
