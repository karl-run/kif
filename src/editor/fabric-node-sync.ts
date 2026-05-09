import { FabricText } from 'fabric'

import { nodeSlice, type TextNode } from './state/node-slice.ts'
import type { AppStore } from './state/redux.ts'

import { OverlayCanvas } from './fabric-canvas.ts'

const IMPACT_FONT_FAMILY = 'Impact'
let activeNodeSync: ReturnType<typeof initializeNodeSync> | null = null

type NodeSyncOptions = {
  fabricCanvas: OverlayCanvas
  onNodesRendered?: () => void
  store: AppStore
}

type FrameContext = {
  frameIndex: number
  frameCount: number
}

export function initializeNodeSync({ fabricCanvas, onNodesRendered, store }: NodeSyncOptions) {
  const fabricTextNodes = new Map<string, FabricText>()
  const fabricTextDisposers = new Map<string, Array<() => void>>()
  let isSyncingNodesToCanvas = false
  let previousNodes = store.getState().nodes
  let currentFrameContext: FrameContext = { frameCount: 0, frameIndex: 0 }

  const syncNodesToCanvas = (): void => {
    if (isSyncingNodesToCanvas) {
      return
    }

    isSyncingNodesToCanvas = true

    try {
      const { allIds, byId } = store.getState().nodes
      const activeIds = new Set(allIds)

      for (const nodeId of fabricTextNodes.keys()) {
        if (!activeIds.has(nodeId)) {
          removeTextNodeFromCanvas(nodeId)
        }
      }

      for (const nodeId of allIds) {
        const node = byId[nodeId]

        if (!node || node.type !== 'text') {
          continue
        }

        upsertTextNodeOnCanvas(node)
      }
    } finally {
      isSyncingNodesToCanvas = false
    }

    applyFrameVisibility(currentFrameContext)
    fabricCanvas.renderAll()
    onNodesRendered?.()
  }

  const unsubscribe = store.subscribe(() => {
    const state = store.getState()

    if (state.nodes === previousNodes) {
      return
    }

    previousNodes = state.nodes
    syncNodesToCanvas()
  })

  syncNodesToCanvas()

  const api = {
    dispose() {
      if (activeNodeSync === api) {
        activeNodeSync = null
      }

      unsubscribe()

      for (const nodeId of Array.from(fabricTextNodes.keys())) {
        removeTextNodeFromCanvas(nodeId)
      }
    },
    renderFrame(frameIndex: number, frameCount: number) {
      currentFrameContext = { frameCount, frameIndex }
      applyFrameVisibility(currentFrameContext)
      fabricCanvas.renderAll()
    },
    selectTextNode(nodeId: string) {
      const textObject = fabricTextNodes.get(nodeId)

      if (!textObject) {
        return
      }

      fabricCanvas.setActiveObject(textObject)
      fabricCanvas.renderAll()
    },
    sync: syncNodesToCanvas,
    toCanvasElementForFrame(frameIndex: number, frameCount: number): HTMLCanvasElement {
      const previousFrameContext = currentFrameContext

      currentFrameContext = { frameCount, frameIndex }
      applyFrameVisibility(currentFrameContext)
      fabricCanvas.renderAll()

      const overlayCanvas = fabricCanvas.toCanvasElement()

      currentFrameContext = previousFrameContext
      applyFrameVisibility(currentFrameContext)
      fabricCanvas.renderAll()

      return overlayCanvas
    },
  }

  activeNodeSync = api
  return api

  function upsertTextNodeOnCanvas(node: TextNode): void {
    let textObject = fabricTextNodes.get(node.id)

    if (!textObject) {
      textObject = createTextObject(node)
      fabricTextNodes.set(node.id, textObject)
      fabricCanvas.add(textObject)
    }

    textObject.set({
      fill: node.fill,
      fontFamily: IMPACT_FONT_FAMILY,
      fontSize: node.fontSize,
      left: node.left,
      stroke: node.stroke ?? undefined,
      strokeWidth: node.strokeWidth,
      text: node.text,
      top: node.top,
      visible: isNodeVisibleAtFrame(node, currentFrameContext),
    })
    textObject.initDimensions()
    textObject.setCoords()
  }

  function createTextObject(node: TextNode): FabricText {
    const textObject = new FabricText(node.text, {
      fill: node.fill,
      fontFamily: IMPACT_FONT_FAMILY,
      fontSize: node.fontSize,
      left: node.left,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      stroke: node.stroke ?? undefined,
      strokeWidth: node.strokeWidth,
      top: node.top,
      visible: isNodeVisibleAtFrame(node, currentFrameContext),
    })

    const syncNodeFromObject = () => {
      if (isSyncingNodesToCanvas) {
        return
      }

      const currentNode = store.getState().nodes.byId[node.id]

      if (!currentNode || currentNode.type !== 'text') {
        return
      }

      const left = textObject.left ?? 0
      const top = textObject.top ?? 0

      if (currentNode.left === left && currentNode.top === top) {
        return
      }

      store.dispatch(
        nodeSlice.actions.updateTextNode({
          id: node.id,
          changes: { left, top },
        }),
      )
    }

    fabricTextDisposers.set(node.id, [textObject.on('modified', syncNodeFromObject)])

    return textObject
  }

  function removeTextNodeFromCanvas(nodeId: string): void {
    const textObject = fabricTextNodes.get(nodeId)

    if (!textObject) {
      return
    }

    for (const dispose of fabricTextDisposers.get(nodeId) ?? []) {
      dispose()
    }

    fabricTextDisposers.delete(nodeId)
    fabricTextNodes.delete(nodeId)
    fabricCanvas.remove(textObject)
  }

  function applyFrameVisibility(frameContext: FrameContext): void {
    const { byId } = store.getState().nodes

    for (const [nodeId, textObject] of fabricTextNodes) {
      const node = byId[nodeId]

      textObject.visible = Boolean(node && node.type === 'text' && isNodeVisibleAtFrame(node, frameContext))
      textObject.setCoords()
    }
  }
}

export function selectCanvasTextNode(nodeId: string): void {
  activeNodeSync?.selectTextNode(nodeId)
}

function isNodeVisibleAtFrame(node: TextNode, frameContext: FrameContext): boolean {
  if (frameContext.frameCount <= 1) {
    return true
  }

  const frameSpan = frameContext.frameCount - 1
  const startFrame = Math.round(clamp01(node.visibleRangeStart) * frameSpan)
  const endFrame = Math.round(clamp01(node.visibleRangeEnd) * frameSpan)
  const lowerBound = Math.min(startFrame, endFrame)
  const upperBound = Math.max(startFrame, endFrame)

  return frameContext.frameIndex >= lowerBound && frameContext.frameIndex <= upperBound
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
