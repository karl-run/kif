export const getFileSignature = (file: File): string => [file.name, file.size, file.type, file.lastModified].join(':')
