import myConfig from '@karl-run/prettier-config'

/** @type {import("prettier").Config} */
let config = {
  ...myConfig,
  plugins: ['prettier-plugin-astro'],
}

export default config
