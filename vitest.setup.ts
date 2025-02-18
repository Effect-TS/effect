import { addEqualityTesters } from "@effect/vitest"

addEqualityTesters()

// Ignore warnings from usage of experimental features to declutter test output.
const ignore = ["ExperimentalWarning"]
const emitWarning = process.emitWarning
process.emitWarning = (warning, ...args) => {
  const [head] = args
  if (head != null) {
    if (typeof head === "string" && ignore.includes(head)) {
      return
    }

    if (typeof head === "object" && ignore.includes(head.type)) {
      return
    }
  }

  return emitWarning(warning, ...args)
}
