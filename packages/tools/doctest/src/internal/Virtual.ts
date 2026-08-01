import { basename, dirname, extname, join } from "node:path"

export const source = (file: string, index: number): string => {
  const sourceExtension = extname(file)
  const extension = sourceExtension === ".tsx" || sourceExtension === ".mts" || sourceExtension === ".cts"
    ? sourceExtension
    : ".ts"
  return join(dirname(file), `.effect-doctest-${basename(file)}-${index}${extension}`)
}
