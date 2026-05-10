type FileSignatureParts = {
  lastModified: number
  name: string
  size: number
  type: string
}

export type StoredFile = FileSignatureParts & {
  frameCount: number
  height: number
  id: string
  width: number
}

let currentBrowserFile: File | null = null

export const getFileSignature = (file: FileSignatureParts): string =>
  [file.name, file.size, file.type, file.lastModified].join(':')

export const createStoredFile = (file: File): StoredFile => ({
  id: getFileSignature(file),
  lastModified: file.lastModified,
  name: file.name,
  size: file.size,
  type: file.type,
  width: 0,
  height: 0,
  frameCount: 0,
})

export const rememberCurrentBrowserFile = (file: File | null): void => {
  currentBrowserFile = file
}

export const getCurrentBrowserFile = (): File | null => currentBrowserFile
