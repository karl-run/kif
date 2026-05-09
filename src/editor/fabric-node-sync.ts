import { FabricImage, FabricText } from 'fabric'

import { nodeSlice, type EditorNode, type PictureNode, type TextNode } from './state/node-slice.ts'
import type { AppStore } from './state/redux.ts'

import { OverlayCanvas } from './fabric-canvas.ts'

const IMPACT_FONT_FAMILY = 'Impact'
let activeNodeSync: ReturnType<typeof initializeNodeSync> | null = null

type CanvasNodeObject = FabricImage | FabricText

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
  const fabricNodes = new Map<string, CanvasNodeObject>()
  const fabricNodeDisposers = new Map<string, Array<() => void>>()
  const pictureLoadControllers = new Map<string, AbortController>()
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

      for (const nodeId of fabricNodes.keys()) {
        if (!activeIds.has(nodeId)) {
          removeNodeFromCanvas(nodeId)
        }
      }

      for (const [index, nodeId] of allIds.entries()) {
        const node = byId[nodeId]

        if (!node) {
          continue
        }

        switch (node.type) {
          case 'picture':
            upsertPictureNodeOnCanvas(node, index)
            break
          case 'text':
            upsertTextNodeOnCanvas(node, index)
            break
        }
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

      for (const nodeId of Array.from(fabricNodes.keys())) {
        removeNodeFromCanvas(nodeId)
      }
    },
    renderFrame(frameIndex: number, frameCount: number) {
      currentFrameContext = { frameCount, frameIndex }
      applyFrameVisibility(currentFrameContext)
      fabricCanvas.renderAll()
    },
    selectNode(nodeId: string) {
      const object = fabricNodes.get(nodeId)

      if (!object) {
        return
      }

      fabricCanvas.setActiveObject(object)
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

  function upsertTextNodeOnCanvas(node: TextNode, index: number): void {
    let textObject = fabricNodes.get(node.id)

    if (!(textObject instanceof FabricText)) {
      textObject = createTextObject(node)
      fabricNodes.set(node.id, textObject)
      fabricCanvas.add(textObject)
    }

    textObject.set({
      angle: node.angle,
      fill: node.fill,
      fontFamily: IMPACT_FONT_FAMILY,
      fontSize: node.fontSize,
      left: node.left,
      scaleX: node.scaleX,
      scaleY: node.scaleY,
      stroke: node.stroke ?? undefined,
      strokeWidth: node.strokeWidth,
      text: node.text,
      top: node.top,
      visible: isNodeVisibleAtFrame(node, currentFrameContext),
    })
    textObject.initDimensions()
    textObject.setCoords()
    fabricCanvas.moveObjectTo(textObject, index)
  }

  function upsertPictureNodeOnCanvas(node: PictureNode, index: number): void {
    let pictureObject = fabricNodes.get(node.id)

    if (!(pictureObject instanceof FabricImage)) {
      pictureObject = createPictureObject(node)
      fabricNodes.set(node.id, pictureObject)
      fabricCanvas.add(pictureObject)
    }

    pictureObject.set({
      angle: node.angle,
      left: node.left,
      scaleX: node.scaleX,
      scaleY: node.scaleY,
      top: node.top,
      visible: Boolean(node.src) && isNodeVisibleAtFrame(node, currentFrameContext),
    })
    pictureObject.setCoords()
    fabricCanvas.moveObjectTo(pictureObject, index)

    void syncPictureSource(node, pictureObject)
  }

  function createTextObject(node: TextNode): FabricText {
    const textObject = new FabricText(node.text, {
      angle: node.angle,
      fill: node.fill,
      fontFamily: IMPACT_FONT_FAMILY,
      fontSize: node.fontSize,
      left: node.left,
      scaleX: node.scaleX,
      scaleY: node.scaleY,
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
      const angle = textObject.angle ?? 0
      const scaleX = textObject.scaleX ?? 1
      const scaleY = textObject.scaleY ?? 1

      if (
        currentNode.left === left &&
        currentNode.top === top &&
        currentNode.angle === angle &&
        currentNode.scaleX === scaleX &&
        currentNode.scaleY === scaleY
      ) {
        return
      }

      store.dispatch(
        nodeSlice.actions.updateTextNode({
          id: node.id,
          changes: { angle, left, scaleX, scaleY, top },
        }),
      )
    }

    fabricNodeDisposers.set(node.id, [textObject.on('modified', syncNodeFromObject)])

    return textObject
  }

  function createPictureObject(node: PictureNode): FabricImage {
    const placeholder = document.createElement('canvas')
    placeholder.width = 1
    placeholder.height = 1

    const pictureObject = new FabricImage(placeholder, {
      angle: node.angle,
      left: node.left,
      scaleX: node.scaleX,
      scaleY: node.scaleY,
      top: node.top,
      visible: false,
    })

    const syncNodeFromObject = () => {
      if (isSyncingNodesToCanvas) {
        return
      }

      const currentNode = store.getState().nodes.byId[node.id]

      if (!currentNode || currentNode.type !== 'picture') {
        return
      }

      const left = pictureObject.left ?? 0
      const top = pictureObject.top ?? 0
      const angle = pictureObject.angle ?? 0
      const scaleX = pictureObject.scaleX ?? 1
      const scaleY = pictureObject.scaleY ?? 1

      if (
        currentNode.left === left &&
        currentNode.top === top &&
        currentNode.angle === angle &&
        currentNode.scaleX === scaleX &&
        currentNode.scaleY === scaleY
      ) {
        return
      }

      store.dispatch(
        nodeSlice.actions.updatePictureNode({
          id: node.id,
          changes: { angle, left, scaleX, scaleY, top },
        }),
      )
    }

    fabricNodeDisposers.set(node.id, [pictureObject.on('modified', syncNodeFromObject)])

    return pictureObject
  }

  async function syncPictureSource(node: PictureNode, pictureObject: FabricImage): Promise<void> {
    const existingController = pictureLoadControllers.get(node.id)
    const currentSrc = pictureObject.getSrc()

    if (!node.src) {
      existingController?.abort()
      pictureLoadControllers.delete(node.id)
      pictureObject.visible = false
      return
    }

    if (currentSrc === node.src) {
      pictureObject.visible = isNodeVisibleAtFrame(node, currentFrameContext)
      return
    }

    existingController?.abort()
    const controller = new AbortController()
    pictureLoadControllers.set(node.id, controller)

    try {
      await pictureObject.setSrc(node.src, { signal: controller.signal })

      if (pictureLoadControllers.get(node.id) !== controller) {
        return
      }

      pictureObject.set({
        visible: isNodeVisibleAtFrame(node, currentFrameContext),
      })
      pictureObject.setCoords()
      fabricCanvas.renderAll()
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'AbortError') {
        throw error
      }
    } finally {
      if (pictureLoadControllers.get(node.id) === controller) {
        pictureLoadControllers.delete(node.id)
      }
    }
  }

  function removeNodeFromCanvas(nodeId: string): void {
    pictureLoadControllers.get(nodeId)?.abort()
    pictureLoadControllers.delete(nodeId)

    const object = fabricNodes.get(nodeId)

    if (!object) {
      return
    }

    for (const dispose of fabricNodeDisposers.get(nodeId) ?? []) {
      dispose()
    }

    fabricNodeDisposers.delete(nodeId)
    fabricNodes.delete(nodeId)
    fabricCanvas.remove(object)
    object.dispose()
  }

  function applyFrameVisibility(frameContext: FrameContext): void {
    const { byId } = store.getState().nodes

    for (const [nodeId, object] of fabricNodes) {
      const node = byId[nodeId]

      object.visible = Boolean(
        node && isNodeVisibleAtFrame(node, frameContext) && (node.type !== 'picture' || node.src),
      )
      object.setCoords()
    }
  }
}

export function selectCanvasNode(nodeId: string): void {
  activeNodeSync?.selectNode(nodeId)
}

function isNodeVisibleAtFrame(node: EditorNode, frameContext: FrameContext): boolean {
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
