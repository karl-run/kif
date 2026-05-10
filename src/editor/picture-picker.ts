export function pickPictureFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.addEventListener(
      'change',
      () => {
        resolve(input.files?.[0] ?? null)
      },
      { once: true },
    )
    input.click()
  })
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener(
      'load',
      () => {
        const result = reader.result

        if (typeof result !== 'string') {
          reject(new Error('Expected a data URL when reading picture node input.'))
          return
        }

        resolve(result)
      },
      { once: true },
    )
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Failed to read picture node input.')), {
      once: true,
    })
    reader.readAsDataURL(file)
  })
}
