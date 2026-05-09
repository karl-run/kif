export interface FileRef {
  id: string
  lastModified: number
  name: string
  size: number
  type: string
}

const fileReferences = new Map<string, File>()

export const rememberFile = (file: File): FileRef => {
  const id = [file.name, file.size, file.type, file.lastModified].join(':')

  fileReferences.set(id, file)

  return {
    id,
    lastModified: file.lastModified,
    name: file.name,
    size: file.size,
    type: file.type,
  }
}

export const getFile = (id: string): File | undefined => fileReferences.get(id)
