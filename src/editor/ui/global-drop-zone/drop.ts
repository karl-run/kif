type GlobalFileDropOptions = {
  ignoreTarget?: (target: EventTarget | null) => boolean
  onDragStateChange?: (isDragging: boolean) => void
  onFileDrop: (file: File) => void
}

const isFileDrag = (event: DragEvent): boolean => event.dataTransfer?.types.includes('Files') ?? false

const isInsideFilePicker = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('[data-file-picker-shell]') !== null

export const registerGlobalFileDrop = ({
  ignoreTarget = isInsideFilePicker,
  onDragStateChange,
  onFileDrop,
}: GlobalFileDropOptions): (() => void) => {
  let dragDepth = 0

  const stopDragging = () => {
    dragDepth = 0
    onDragStateChange?.(false)
  }

  const handleGlobalDragEnter = (event: DragEvent) => {
    if (!isFileDrag(event) || ignoreTarget(event.target)) {
      return
    }

    dragDepth += 1
    onDragStateChange?.(true)
  }

  const handleGlobalDragLeave = (event: DragEvent) => {
    if (!isFileDrag(event) || ignoreTarget(event.target)) {
      return
    }

    dragDepth = Math.max(0, dragDepth - 1)

    if (dragDepth === 0) {
      onDragStateChange?.(false)
    }
  }

  const handleGlobalDragOver = (event: DragEvent) => {
    if (!isFileDrag(event) || ignoreTarget(event.target)) {
      return
    }

    event.preventDefault()
    onDragStateChange?.(true)
  }

  const handleGlobalDrop = (event: DragEvent) => {
    if (!isFileDrag(event) || ignoreTarget(event.target)) {
      return
    }

    event.preventDefault()
    stopDragging()

    const file = event.dataTransfer?.files?.[0]

    if (!file) {
      return
    }

    onFileDrop(file)
  }

  document.addEventListener('dragenter', handleGlobalDragEnter, { capture: true })
  document.addEventListener('dragleave', handleGlobalDragLeave, { capture: true })
  document.addEventListener('dragover', handleGlobalDragOver, { capture: true })
  document.addEventListener('drop', handleGlobalDrop, { capture: true })
  window.addEventListener('blur', stopDragging)

  return () => {
    document.removeEventListener('dragenter', handleGlobalDragEnter, { capture: true })
    document.removeEventListener('dragleave', handleGlobalDragLeave, { capture: true })
    document.removeEventListener('dragover', handleGlobalDragOver, { capture: true })
    document.removeEventListener('drop', handleGlobalDrop, { capture: true })
    window.removeEventListener('blur', stopDragging)
  }
}
