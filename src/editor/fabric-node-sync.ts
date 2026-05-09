import { FabricText } from 'fabric'

import { nodeSlice, type TextNode } from './state/node-slice.ts'
import type { AppStore } from './state/redux.ts'

import { OverlayCanvas } from './fabric-canvas.ts'

const IMPACT_FONT_FAMILY = 'Impact'

type NodeSyncOptions = {
  fabricCanvas: OverlayCanvas
  onNodesRendered?: () => void
  store: AppStore
}

export function initializeNodeSync({ fabricCanvas, onNodesRendered, store }: NodeSyncOptions) {
  const fabricTextNodes = new Map<string, FabricText>()
  const fabricTextDisposers = new Map<string, Array<() => void>>()
  let isSyncingNodesToCanvas = false
  let previousNodes = store.getState().nodes

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

  return {
    dispose() {
      unsubscribe()

      for (const nodeId of Array.from(fabricTextNodes.keys())) {
        removeTextNodeFromCanvas(nodeId)
      }
    },
    sync: syncNodesToCanvas,
  }

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
}
