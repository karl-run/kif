import { StaticCanvas, FabricText } from 'fabric'

const filePickerShell = document.getElementById('kif-file-picker-shell')
const filePickerInput = document.getElementById('kif-file-picker')
const canvasEl = document.getElementById('da-canvas') as HTMLCanvasElement
const canvas = new StaticCanvas(canvasEl)
const helloWorld = new FabricText('Hello world!')
canvas.add(helloWorld)
canvas.centerObject(helloWorld)

if (filePickerShell && filePickerInput instanceof HTMLInputElement) {
  const setDragging = (dragging: boolean) => {
    filePickerInput.classList.toggle('border-sky-400', dragging)
    filePickerInput.classList.toggle('bg-sky-50', dragging)
  }

  filePickerShell.addEventListener('dragenter', () => setDragging(true))
  filePickerShell.addEventListener('dragleave', () => setDragging(false))
  filePickerShell.addEventListener('drop', () => setDragging(false))
}
