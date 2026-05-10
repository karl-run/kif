<script>
  import FilePicker from '@editor/ui/FilePicker.svelte'
  import ExportPanel from '@editor/ui/export/ExportPanel.svelte'
  import GlobalDropZone from '@editor/ui/global-drop-zone/GlobalDropZone.svelte'
  import OverlaysPanel from '@editor/ui/overlays/OverlaysPanel.svelte'
  import PreviewTimeline from '@editor/ui/preview/PreviewTimeline.svelte'
  import PreviewViewport from '@editor/ui/preview/PreviewViewport.svelte'
</script>

<GlobalDropZone />

<div class="container mx-auto grid grid-cols-1 xl:grid-cols-2 gap-4 p-2 md:4-8">
  <div><FilePicker /></div>
  <div><PreviewViewport /></div>
  <div><PreviewTimeline /></div>
  <div class="xl:col-start-2 xl:row-start-1 xl:row-span-5">
    <OverlaysPanel />
  </div>
  <div><ExportPanel /></div>
</div>
