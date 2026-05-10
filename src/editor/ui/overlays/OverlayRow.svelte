<script lang="ts">
  import { selectCanvasNode } from '@editor/fabric-node-sync.ts'
  import { pickPictureFile, readFileAsDataUrl } from '@editor/picture-picker.ts'
  import {
    createPictureNode,
    createTextNode,
    nodeSlice,
    type EditorNode,
    type PictureNode,
    type TextNode,
  } from '@editor/state/node-slice.ts'
  import { dispatch } from '@editor/state/svelte.ts'

  import VisibilityRangeControl from './VisibilityRangeControl.svelte'

  let {
    currentPreviewFrameIndex,
    frameCount,
    node,
    title,
  }: {
    currentPreviewFrameIndex: number
    frameCount: number
    node: EditorNode
    title: string
  } = $props()

  const deleteNode = () => {
    dispatch(nodeSlice.actions.removeNode(node.id))
  }

  const duplicateNode = () => {
    switch (node.type) {
      case 'picture':
        dispatch(
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
        dispatch(
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

  const handleTextFocus = () => {
    selectCanvasNode(node.id)
  }

  const handleTextInput = (event: Event) => {
    const input = event.currentTarget

    if (!(input instanceof HTMLInputElement) || node.type !== 'text') {
      return
    }

    selectCanvasNode(node.id)
    dispatch(
      nodeSlice.actions.updateTextNode({
        id: node.id,
        changes: { text: input.value },
      }),
    )
  }

  const replacePicture = async () => {
    if (node.type !== 'picture') {
      return
    }

    selectCanvasNode(node.id)

    const file = await pickPictureFile()

    if (!file) {
      return
    }

    dispatch(
      nodeSlice.actions.updatePictureNode({
        id: node.id,
        changes: {
          name: file.name,
          src: await readFileAsDataUrl(file),
        },
      }),
    )
  }

  const pictureNode = $derived(node.type === 'picture' ? node : null)
  const textNode = $derived(node.type === 'text' ? node : null)
</script>

<div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
  <div class="mb-3 flex items-center justify-between gap-3">
    <div class="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        onclick={duplicateNode}
      >
        Duplicate
      </button>
      <button
        type="button"
        class="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-950/40"
        onclick={deleteNode}
      >
        Delete
      </button>
    </div>
  </div>

  {#if textNode}
    <input
      type="text"
      class="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-sky-950"
      placeholder="Write overlay text"
      value={textNode.text}
      onfocus={handleTextFocus}
      oninput={handleTextInput}
    />
  {:else if pictureNode}
    <div class="space-y-3">
      <div class="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
        <img
          class="h-16 w-16 rounded-md border border-zinc-200 bg-zinc-100 object-contain dark:border-zinc-700 dark:bg-zinc-900"
          class:invisible={!pictureNode.src}
          alt=""
          src={pictureNode.src || undefined}
        />

        <div class="min-w-0 flex-1 space-y-2">
          <div class="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{pictureNode.name || 'Image'}</div>

          <button
            type="button"
            class="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            onclick={replacePicture}
          >
            Replace image
          </button>
        </div>
      </div>
    </div>
  {/if}

  <VisibilityRangeControl {node} {frameCount} {currentPreviewFrameIndex} />
</div>
