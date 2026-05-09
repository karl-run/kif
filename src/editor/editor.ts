import { StaticCanvas, FabricText } from 'fabric'

const canvasEl = document.getElementById('da-canvas') as HTMLCanvasElement
const canvas = new StaticCanvas(canvasEl)
const helloWorld = new FabricText('Hello world!')
canvas.add(helloWorld)
canvas.centerObject(helloWorld)
