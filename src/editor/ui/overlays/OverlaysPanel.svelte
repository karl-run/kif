<script lang="ts">
  import { createPictureNode, createTextNode, nodeSlice } from '@editor/state/node-slice.ts'
  import { dispatch, selectState } from '@editor/state/svelte.ts'
  import { pickPictureFile, readFileAsDataUrl } from '@editor/picture-picker.ts'

  import OverlayControlsList from './OverlayControlsList.svelte'

  const nodes = selectState((state) => state.nodes)

  const createTextOverlay = () => {
    const nodeCount = $nodes.allIds.length
    const offset = nodeCount * 24

    dispatch(
      nodeSlice.actions.upsertTextNode(
        createTextNode({
          left: 120 + offset,
          text: `Text ${nodeCount + 1}`,
          top: 114 + offset,
        }),
      ),
    )
  }

  const createPictureOverlay = async () => {
    const file = await pickPictureFile()

    if (!file) {
      return
    }

    const nodeCount = $nodes.allIds.length
    const offset = nodeCount * 24

    dispatch(
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
</script>

<section
  class="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
>
  <div class="flex items-center justify-between gap-4">
    <div>
      <h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Overlays</h2>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">Add or edit text and picture in the gif.</p>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        onclick={createPictureOverlay}
      >
        Add picture
      </button>
      <button
        type="button"
        class="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        onclick={createTextOverlay}
      >
        Add text
      </button>
    </div>
  </div>
  <OverlayControlsList />
</section>
