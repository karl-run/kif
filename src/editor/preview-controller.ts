type PreviewController = {
  syncPreview: () => void | Promise<void>
}

let activePreviewController: PreviewController | null = null

export const registerPreviewController = (controller: PreviewController): (() => void) => {
  activePreviewController = controller

  return () => {
    if (activePreviewController === controller) {
      activePreviewController = null
    }
  }
}

export const requestPreviewSync = async (): Promise<void> => {
  await activePreviewController?.syncPreview()
}
