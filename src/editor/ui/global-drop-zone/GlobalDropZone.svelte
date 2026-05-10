<script lang="ts">
  import { onMount } from 'svelte'

  import { registerGlobalFileDrop } from './drop.ts'
  import { rememberFile } from '@editor/state/file-registry.ts'
  import { fileSlice } from '@editor/state/file-slice.ts'
  import { store } from '@editor/state/redux.ts'

  let isDragging = $state(false)

  const setCurrentFile = (file: File) => {
    store.dispatch(fileSlice.actions.file(rememberFile(file)))
  }

  onMount(() => {
    return registerGlobalFileDrop({
      onDragStateChange: (nextIsDragging) => {
        isDragging = nextIsDragging
      },
      onFileDrop: setCurrentFile,
    })
  })
</script>

{#if isDragging}
  <div
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-6 backdrop-blur-sm"
  >
    <div
      class="flex min-h-48 w-full max-w-2xl items-center justify-center rounded-3xl border-2 border-dashed border-sky-400 bg-white/95 px-8 py-10 text-center shadow-xl dark:bg-zinc-900/95"
    >
      <div class="space-y-2">
        <p class="text-xl font-semibold text-zinc-950 dark:text-zinc-50">Drop GIF anywhere</p>
        <p class="text-sm text-zinc-600 dark:text-zinc-300">Release to load it into the editor.</p>
      </div>
    </div>
  </div>
{/if}
