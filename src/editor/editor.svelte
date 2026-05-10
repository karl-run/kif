<script>
  import FilePicker from '@editor/ui/FilePicker.svelte'
  import GlobalDropZone from '@editor/ui/global-drop-zone/GlobalDropZone.svelte'
  import OverlaysPanel from '@editor/ui/overlays/OverlaysPanel.svelte'
  import PreviewTimeline from '@editor/ui/preview/PreviewTimeline.svelte'
  import PreviewViewport from '@editor/ui/preview/PreviewViewport.svelte'
</script>

<GlobalDropZone />
<FilePicker />
<PreviewViewport />
<PreviewTimeline />
<OverlaysPanel />
