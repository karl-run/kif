const filePickerShell = document.getElementById('kif-file-picker-shell')

const isInsideFilePicker = (target: EventTarget | null): boolean =>
  target instanceof Node && Boolean(filePickerShell?.contains(target))

const stopGlobalFileDrop = (event: DragEvent) => {
  if (isInsideFilePicker(event.target)) {
    return
  }

  event.preventDefault()
}

document.addEventListener('dragover', stopGlobalFileDrop, { capture: true })
document.addEventListener('drop', stopGlobalFileDrop, { capture: true })
