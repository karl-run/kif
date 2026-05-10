<script lang="ts">
  import Pause from '@lucide/svelte/icons/pause'
  import Play from '@lucide/svelte/icons/play'
  import SkipBack from '@lucide/svelte/icons/skip-back'
  import SkipForward from '@lucide/svelte/icons/skip-forward'

  import { fileSlice } from '@editor/state/file-slice.ts'
  import { dispatch, selectState } from '@editor/state/svelte.ts'

  const files = selectState((state) => state.files)

  const stepFrame = (direction: -1 | 1) => {
    if ($files.currentGifFrameCount === 0) {
      return
    }

    const nextFrameIndex =
      ($files.currentPreviewFrameIndex + direction + $files.currentGifFrameCount) % $files.currentGifFrameCount

    dispatch(fileSlice.actions.previewFrameIndex(nextFrameIndex))
  }

  const togglePlayback = () => {
    if ($files.currentGifFrameCount === 0) {
      return
    }

    dispatch(fileSlice.actions.previewPlaying(!$files.isPreviewPlaying))
  }
</script>

<div
  id="preview-viewport"
  class="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
>
  <div id="preview-viewport-inner" class="relative flex min-h-80 w-full items-center justify-center p-4 sm:p-6">
    <div class="absolute left-4 top-4 z-20 flex flex-wrap gap-1.5">
      <button
        type="button"
        aria-label={$files.isPreviewPlaying ? 'Pause preview' : 'Play preview'}
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-white/95 text-sm leading-none text-sky-700 shadow-sm backdrop-blur-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-white/80 disabled:text-zinc-400 dark:border-sky-800 dark:bg-zinc-950/90 dark:text-sky-300 dark:hover:bg-zinc-900 dark:disabled:border-zinc-800 dark:disabled:bg-zinc-950/80 dark:disabled:text-zinc-600"
        disabled={$files.currentGifFrameCount === 0}
        onclick={togglePlayback}
      >
        {#if $files.isPreviewPlaying}
          <Pause aria-hidden="true" class="h-4 w-4" strokeWidth={2.25} />
        {:else}
          <Play aria-hidden="true" class="h-4 w-4" strokeWidth={2.25} />
        {/if}
      </button>
      <button
        type="button"
        aria-label="Previous frame"
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white/95 text-sm leading-none text-zinc-700 shadow-sm backdrop-blur-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-white/80 disabled:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:disabled:border-zinc-800 dark:disabled:bg-zinc-950/80 dark:disabled:text-zinc-600"
        disabled={$files.currentGifFrameCount === 0}
        onclick={() => stepFrame(-1)}
      >
        <SkipBack aria-hidden="true" class="h-4 w-4" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        aria-label="Next frame"
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white/95 text-sm leading-none text-zinc-700 shadow-sm backdrop-blur-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-white/80 disabled:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:disabled:border-zinc-800 dark:disabled:bg-zinc-950/80 dark:disabled:text-zinc-600"
        disabled={$files.currentGifFrameCount === 0}
        onclick={() => stepFrame(1)}
      >
        <SkipForward aria-hidden="true" class="h-4 w-4" strokeWidth={2.25} />
      </button>
    </div>
    <div id="preview-stage" class="relative">
      <div id="canvas-stack-shell" class="inline-block origin-top-left pt-4 pr-6 pb-5">
        <div id="canvas-stack" class="relative shrink-0">
          <div
            id="gif-width"
            class="pointer-events-none absolute inset-x-0 -top-4 flex justify-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
          </div>
          <div
            id="gif-height"
            class="pointer-events-none absolute left-full top-1/2 -translate-x-2 -translate-y-1/2 rotate-90 whitespace-nowrap text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
          </div>
          <div
            id="gif-frame-counter"
            class="pointer-events-none absolute inset-x-0 -bottom-5 flex justify-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
          </div>
          <canvas
            id="da-canvas"
            class="block border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950"
            width="240"
            height="240"></canvas>
          <canvas id="fabric-canvas" class="absolute inset-0" width="240" height="240"></canvas>
        </div>
      </div>
    </div>
  </div>
</div>
