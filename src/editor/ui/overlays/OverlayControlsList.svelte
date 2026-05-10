<script lang="ts">
  import type { EditorNode } from '@editor/state/node-slice.ts'
  import { previewStore } from '@editor/state/preview.ts'
  import { selectState } from '@editor/state/svelte.ts'

  import OverlayRow from './OverlayRow.svelte'

  type OverlayItem = {
    currentPreviewFrameIndex: number
    frameCount: number
    node: EditorNode
    title: string
  }

  const nodes = selectState((state) => state.nodes)
  const currentFile = selectState((state) => state.files.currentFile)

  const overlayItems = $derived.by<OverlayItem[]>(() => {
    let textCount = 0
    let pictureCount = 0

    return $nodes.allIds.flatMap((nodeId) => {
      const node = $nodes.byId[nodeId]

      if (!node) {
        return []
      }

      return [
        {
          currentPreviewFrameIndex: $previewStore.currentPreviewFrameIndex,
          frameCount: $currentFile?.frameCount ?? 0,
          node,
          title: node.type === 'text' ? `Text ${++textCount}` : `Picture ${++pictureCount}`,
        },
      ]
    })
  })
</script>

{#if overlayItems.length === 0}
  <p class="text-sm text-zinc-600 dark:text-zinc-400">No overlays yet.</p>
{:else}
  <div class="space-y-3 text-sm text-zinc-600">
    {#each overlayItems as item (item.node.id)}
      <OverlayRow
        node={item.node}
        title={item.title}
        frameCount={item.frameCount}
        currentPreviewFrameIndex={item.currentPreviewFrameIndex}
      />
    {/each}
  </div>
{/if}
