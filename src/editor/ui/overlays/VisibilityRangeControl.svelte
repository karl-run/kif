<script lang="ts">
  import { selectCanvasNode } from '@editor/fabric-node-sync.ts'
  import { nodeSlice, type EditorNode } from '@editor/state/node-slice.ts'
  import { dispatch } from '@editor/state/svelte.ts'

  type RangeHandle = 'start' | 'end'

  let {
    currentPreviewFrameIndex,
    frameCount,
    node,
  }: {
    currentPreviewFrameIndex: number
    frameCount: number
    node: EditorNode
  } = $props()

  let activeHandle = $state<RangeHandle | null>(null)
  let sliderShellEl: HTMLDivElement

  const clampPercent = (value: number): number => Math.min(100, Math.max(0, value))

  const formatFrameIndex = (rangeValue: number, nextFrameCount: number): number =>
    Math.round((clampPercent(rangeValue * 100) / 100) * (nextFrameCount - 1)) + 1

  const updateNode = (changes: Partial<Pick<EditorNode, 'visibleRangeEnd' | 'visibleRangeStart'>>) => {
    switch (node.type) {
      case 'picture':
        dispatch(
          nodeSlice.actions.updatePictureNode({
            id: node.id,
            changes,
          }),
        )
        break
      case 'text':
        dispatch(
          nodeSlice.actions.updateTextNode({
            id: node.id,
            changes,
          }),
        )
        break
    }
  }

  const stopRangeDrag = () => {
    activeHandle = null
  }

  const updateRangeFromPointer = (handle: RangeHandle, clientX: number) => {
    const sliderBounds = sliderShellEl?.getBoundingClientRect()

    if (!sliderBounds || sliderBounds.width <= 0) {
      return
    }

    const nextValue = Math.min(1, Math.max(0, (clientX - sliderBounds.left) / sliderBounds.width))

    updateNode(
      handle === 'start'
        ? { visibleRangeStart: Math.min(nextValue, node.visibleRangeEnd) }
        : { visibleRangeEnd: Math.max(nextValue, node.visibleRangeStart) },
    )
  }

  const beginRangeDrag = (handle: RangeHandle, event: PointerEvent) => {
    if (frameCount <= 1) {
      return
    }

    selectCanvasNode(node.id)
    activeHandle = handle
    event.preventDefault()
    updateRangeFromPointer(handle, event.clientX)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!activeHandle) {
      return
    }

    updateRangeFromPointer(activeHandle, event.clientX)
  }

  const snapVisibleRangeToCurrentFrame = (edge: RangeHandle) => {
    if (frameCount <= 1) {
      return
    }

    selectCanvasNode(node.id)

    const currentFrameValue = currentPreviewFrameIndex / (frameCount - 1)

    updateNode(
      edge === 'start'
        ? {
            visibleRangeEnd: Math.max(currentFrameValue, node.visibleRangeEnd),
            visibleRangeStart: currentFrameValue,
          }
        : {
            visibleRangeEnd: currentFrameValue,
            visibleRangeStart: Math.min(node.visibleRangeStart, currentFrameValue),
          },
    )
  }

  const startPercent = $derived(clampPercent(node.visibleRangeStart * 100))
  const endPercent = $derived(clampPercent(node.visibleRangeEnd * 100))
  const visibilityLabel = $derived(
    frameCount > 1
      ? `Frames ${formatFrameIndex(node.visibleRangeStart, frameCount)}-${formatFrameIndex(node.visibleRangeEnd, frameCount)}`
      : 'Load a GIF to set visibility',
  )
</script>

<svelte:document onpointermove={handlePointerMove} onpointerup={stopRangeDrag} onpointercancel={stopRangeDrag} />

<div class="mt-3 space-y-2">
  <div class="flex items-center justify-between gap-3">
    <div class="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Visible range</div>
    <div class="text-xs text-zinc-600 dark:text-zinc-400">{visibilityLabel}</div>
  </div>

  <div bind:this={sliderShellEl} class="relative h-9 touch-none">
    <div class="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
    <div
      class="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-sky-400"
      style:left={`${startPercent}%`}
      style:width={`${Math.max(endPercent - startPercent, 0)}%`}
    ></div>

    <button
      type="button"
      class="absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-500 bg-white shadow-sm disabled:opacity-50 dark:bg-zinc-950"
      style:left={`${startPercent}%`}
      aria-label="Start of visible range"
      disabled={frameCount <= 1}
      onpointerdown={(event) => beginRangeDrag('start', event)}
    ></button>

    <button
      type="button"
      class="absolute top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-500 bg-white shadow-sm disabled:opacity-50 dark:bg-zinc-950"
      style:left={`${endPercent}%`}
      aria-label="End of visible range"
      disabled={frameCount <= 1}
      onpointerdown={(event) => beginRangeDrag('end', event)}
    ></button>
  </div>

  <div class="flex items-center justify-between gap-3">
    <button
      type="button"
      class="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:disabled:text-zinc-600"
      disabled={frameCount <= 1}
      onclick={() => snapVisibleRangeToCurrentFrame('start')}
    >
      Set start to current
    </button>

    <button
      type="button"
      class="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:disabled:text-zinc-600"
      disabled={frameCount <= 1}
      onclick={() => snapVisibleRangeToCurrentFrame('end')}
    >
      Set end to current
    </button>
  </div>
</div>
