import { StaticCanvas, FabricText } from 'fabric'

import { fileSlice } from './state/file-slice.ts'
import { rememberFile } from './state/file-registry.ts'
import { store } from './state/redux.ts'

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

  const syncPickedFile = () => {
    const file = filePickerInput.files?.[0]
    store.dispatch(fileSlice.actions.file(file ? rememberFile(file) : null))
  }

  filePickerShell.addEventListener('dragenter', () => setDragging(true))
  filePickerShell.addEventListener('dragleave', () => setDragging(false))
  filePickerShell.addEventListener('drop', () => {
    setDragging(false)
  })
  filePickerInput.addEventListener('change', syncPickedFile)
}

console.log(store.getState())
