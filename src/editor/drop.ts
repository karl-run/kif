import { rememberFile } from './state/file-registry.ts'
import { fileSlice } from './state/file-slice.ts'
import { store } from './state/redux.ts'

const isInsideFilePicker = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('[data-file-picker-shell]') !== null

const handleGlobalDragOver = (event: DragEvent) => {
  if (isInsideFilePicker(event.target)) {
    return
  }

  event.preventDefault()
}

const handleGlobalDrop = (event: DragEvent) => {
  if (isInsideFilePicker(event.target)) {
    return
  }

  event.preventDefault()

  const file = event.dataTransfer?.files?.[0]

  if (!file) {
    return
  }

  store.dispatch(fileSlice.actions.file(rememberFile(file)))
}

document.addEventListener('dragover', handleGlobalDragOver, { capture: true })
document.addEventListener('drop', handleGlobalDrop, { capture: true })
