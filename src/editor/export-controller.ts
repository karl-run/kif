type ExportController = {
  exportGif: () => Blob | Promise<Blob | null> | null
  onDialogClosed?: () => void
}

let activeExportController: ExportController | null = null

export const registerExportController = (controller: ExportController): (() => void) => {
  activeExportController = controller

  return () => {
    if (activeExportController === controller) {
      activeExportController = null
    }
  }
}

export const requestGifExport = async (): Promise<Blob | null> => {
  const exportedGif = await activeExportController?.exportGif()
  return exportedGif ?? null
}

export const notifyExportDialogClosed = (): void => {
  activeExportController?.onDialogClosed?.()
}
