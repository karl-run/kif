const IMPACT_FONT_FAMILY = 'Impact'
let impactFontReadyPromise: Promise<void> | null = null

export function waitForImpactFont(): Promise<void> {
  if (impactFontReadyPromise) {
    return impactFontReadyPromise
  }

  impactFontReadyPromise = (async () => {
    if (!('fonts' in document)) {
      return
    }

    if (document.fonts.check(`48px "${IMPACT_FONT_FAMILY}"`)) {
      return
    }

    await document.fonts.load(`48px "${IMPACT_FONT_FAMILY}"`)
  })()

  return impactFontReadyPromise
}
