<script lang="ts">
  import { onMount } from 'svelte'

  import { requestPreviewSync } from '@editor/preview-controller.ts'
  import { getFileSignature } from '@editor/state/file.ts'
  import { fileSlice } from '@editor/state/file-slice.ts'
  import { store } from '@editor/state/redux.ts'

  const inputId = 'kif-file-picker-svelte'
  const RESTORE_ATTEMPT_DELAY_MS = 150
  const RESTORE_ATTEMPT_LIMIT = 8

  let inputEl: HTMLInputElement
  let isDragging = $state(false)

  const setCurrentFile = (file: File | null | undefined) => {
    store.dispatch(fileSlice.actions.file(file ?? null))
  }

  const syncPickedFile = async (options?: { preserveWhenEmpty?: boolean }) => {
    const file = inputEl?.files?.[0] ?? null
    const currentFile = store.getState().files.currentFile

    if (!file && options?.preserveWhenEmpty) {
      return
    }

    if (file && currentFile && getFileSignature(currentFile) === getFileSignature(file)) {
      await requestPreviewSync()
      return
    }

    store.dispatch(fileSlice.actions.file(file))
  }

  const handleDragEnter = (event: DragEvent) => {
    if (!event.dataTransfer?.types.includes('Files')) {
      return
    }

    isDragging = true
  }

  const handleDragLeave = (event: DragEvent) => {
    if (!event.dataTransfer?.types.includes('Files')) {
      return
    }

    isDragging = false
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    isDragging = false
    setCurrentFile(event.dataTransfer?.files?.[0] ?? null)
  }

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
  }

  onMount(() => {
    let remainingRestoreAttempts = RESTORE_ATTEMPT_LIMIT

    const restorePickedFile = () => {
      window.requestAnimationFrame(() => {
        void syncPickedFile({ preserveWhenEmpty: true })

        if (inputEl?.files?.[0] || remainingRestoreAttempts <= 0) {
          return
        }

        remainingRestoreAttempts -= 1
        window.setTimeout(restorePickedFile, RESTORE_ATTEMPT_DELAY_MS)
      })
    }

    const handlePageShow = () => {
      remainingRestoreAttempts = RESTORE_ATTEMPT_LIMIT
      restorePickedFile()
    }

    handlePageShow()
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      window.removeEventListener('pageshow', handlePageShow)
    }
  })
</script>

<label
  id="kif-file-picker-shell-svelte"
  data-file-picker-shell
  class="relative block w-full"
  for={inputId}
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondragover={handleDragOver}
  ondrop={handleDrop}
>
  <span class="pointer-events-none absolute inset-x-6 top-6 block">
    <span class="block text-lg font-medium text-zinc-900 dark:text-zinc-100">Click to choose a GIF</span>
    <span class="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">Or drop one here.</span>
  </span>

  <input
    bind:this={inputEl}
    id={inputId}
    type="file"
    accept="image/gif"
    class="block w-full cursor-pointer rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 px-6 pb-6 pt-24 text-sm text-zinc-700 transition hover:border-sky-400 hover:bg-sky-50 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-sky-500 dark:hover:bg-zinc-900 dark:file:bg-zinc-100 dark:file:text-zinc-900 dark:hover:file:bg-white"
    class:border-sky-400={isDragging}
    class:bg-sky-50={isDragging}
    onchange={syncPickedFile}
  />
</label>
