<script lang="ts">
  import { onDestroy } from 'svelte'

  import { requestGifExport, notifyExportDialogClosed } from '@editor/export-controller.ts'
  import { previewStore } from '@editor/state/preview.ts'

  let dialogEl = $state<HTMLDialogElement | null>(null)
  let exportedGifUrl = $state<string | null>(null)
  let isExporting = $state(false)

  const closeDialog = () => {
    dialogEl?.close()
  }

  const handleDialogClose = () => {
    notifyExportDialogClosed()
  }

  const requestExport = async () => {
    if ($previewStore.currentGifFrameCount === 0 || isExporting) {
      return
    }

    isExporting = true

    try {
      const exportedGif = await requestGifExport()

      if (!exportedGif) {
        return
      }

      if (exportedGifUrl) {
        URL.revokeObjectURL(exportedGifUrl)
      }

      exportedGifUrl = URL.createObjectURL(exportedGif)
      dialogEl?.showModal()
    } finally {
      isExporting = false
    }
  }

  onDestroy(() => {
    if (exportedGifUrl) {
      URL.revokeObjectURL(exportedGifUrl)
    }
  })
</script>

<button
  type="button"
  class="w-full rounded-2xl bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-green-700 dark:hover:bg-green-600 dark:disabled:bg-zinc-700"
  disabled={$previewStore.currentGifFrameCount === 0 || isExporting}
  onclick={requestExport}
>
  {isExporting ? 'Exporting…' : 'Export'}
</button>

<dialog
  bind:this={dialogEl}
  class="max-w-[min(90vw,900px)] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-950 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
  onclose={handleDialogClose}
>
  <div class="space-y-4 p-4 sm:p-6">
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Exported GIF</h2>
      <button
        type="button"
        class="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        onclick={closeDialog}
      >
        Close
      </button>
    </div>
    <img
      alt="Exported GIF preview"
      class="mx-auto max-h-[70vh] max-w-full border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950"
      src={exportedGifUrl ?? undefined}
    />
    <a
      download="kif-export.gif"
      class="inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      href={exportedGifUrl ?? undefined}
    >
      Download GIF
    </a>
  </div>
</dialog>
