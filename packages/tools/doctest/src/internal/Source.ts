const jsdocPattern = /\/\*\*[\s\S]*?\*\//g
const fencePattern = /(?:```|~~~)(.*?)\n/g

export const hasRunnableExamples = (source: string): boolean => {
  for (const doc of source.matchAll(jsdocPattern)) {
    for (const fence of doc[0].matchAll(fencePattern)) {
      const metadata = fence[1].toLowerCase()
      if (
        (metadata.startsWith("ts") || metadata.startsWith("typescript")) &&
        !metadata.includes("skip-type-checking")
      ) {
        return true
      }
    }
  }
  return false
}
