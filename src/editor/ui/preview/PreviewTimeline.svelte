<script lang="ts">
  import { fileSlice } from '@editor/state/file-slice.ts'
  import { dispatch, selectState } from '@editor/state/svelte.ts'

  const files = selectState((state) => state.files)

  let shouldResumePreviewAfterTimelineScrub = false

  const finishTimelineScrub = () => {
    if (!shouldResumePreviewAfterTimelineScrub || $files.currentGifFrameCount === 0) {
      shouldResumePreviewAfterTimelineScrub = false
      return
    }

    shouldResumePreviewAfterTimelineScrub = false
    dispatch(fileSlice.actions.previewPlaying(true))
  }

  const handleTimelinePointerDown = () => {
    if ($files.currentGifFrameCount === 0) {
      return
    }

    shouldResumePreviewAfterTimelineScrub = $files.isPreviewPlaying

    if (shouldResumePreviewAfterTimelineScrub) {
      dispatch(fileSlice.actions.previewPlaying(false))
    }
  }

  const handleTimelineInput = (event: Event) => {
    const slider = event.currentTarget

    if (!(slider instanceof HTMLInputElement)) {
      return
    }

    const frameIndex = Number.parseInt(slider.value, 10)

    if (Number.isNaN(frameIndex)) {
      return
    }

    dispatch(fileSlice.actions.previewFrameIndex(frameIndex))
  }

  const sliderMax = () => Math.max($files.currentGifFrameCount - 1, 0)
  const sliderValue = () => Math.min($files.currentPreviewFrameIndex, sliderMax())
  const timelineProgress = () => ($files.currentGifFrameCount > 1 ? $files.currentPreviewFrameIndex / sliderMax() : 0)
</script>

<svelte:document onpointerup={finishTimelineScrub} onpointercancel={finishTimelineScrub} />

<div
  id="preview-timeline-shell"
  class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
  class:opacity-50={$files.currentGifFrameCount === 0}
>
  <div
    class="border-b border-zinc-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
  >
    Timeline
  </div>
  <div id="preview-timeline" class="relative h-18 bg-zinc-200 dark:bg-zinc-800">
    <div id="preview-timeline-thumbnails" class="absolute inset-0 flex items-stretch gap-px"></div>
    <div
      class="pointer-events-none absolute inset-y-0 z-20 -ml-px w-0.5 bg-sky-500"
      class:hidden={$files.currentGifFrameCount === 0}
      style:left={`${timelineProgress() * 100}%`}
    >
    </div>
    <div
      class="pointer-events-none absolute inset-y-1 z-20 -ml-[0.4375rem] w-[0.875rem] rounded-full bg-white/72 shadow-[inset_0_0_0_2px_rgb(14_165_233),0_1px_2px_rgb(0_0_0_/_0.16)] dark:bg-zinc-50/72"
      class:hidden={$files.currentGifFrameCount === 0}
      style:left={`${timelineProgress() * 100}%`}
    >
    </div>
    <input
      id="preview-timeline-slider"
      type="range"
      min="0"
      max={sliderMax()}
      value={sliderValue()}
      step="1"
      aria-label="Preview timeline"
      class="kif-timeline-slider absolute inset-0 z-30 h-full w-full cursor-ew-resize bg-transparent disabled:cursor-not-allowed"
      disabled={$files.currentGifFrameCount === 0}
      onpointerdown={handleTimelinePointerDown}
      oninput={handleTimelineInput}
      onchange={finishTimelineScrub}
    />
  </div>
</div>
