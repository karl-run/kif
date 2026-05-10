import { Canvas, CanvasDOMManager } from 'fabric'

class OverlayCanvasDOMManager extends CanvasDOMManager {
  protected createContainerElement() {
    const container = super.createContainerElement()
    container.style.position = 'absolute'
    container.style.inset = '0'
    container.style.zIndex = '10'
    return container
  }
}

export class OverlayCanvas extends Canvas {
  protected initElements(el?: string | HTMLCanvasElement) {
    this.elements = new OverlayCanvasDOMManager(el, {
      allowTouchScrolling: this.allowTouchScrolling,
      containerClass: this.containerClass,
    })
    this._createCacheCanvas()
  }
}
