/* eslint-disable no-undef */
import * as Fs from "fs/promises"

const jsBundle = await fetch(
  "https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.min.js"
).then((res) => res.text())

const source = `/* eslint-disable */

/** @internal */
export const javascript = ${JSON.stringify(`${jsBundle}`)}
`

await Fs.writeFile("packages/platform/src/internal/httpApiScalar.ts", source)
