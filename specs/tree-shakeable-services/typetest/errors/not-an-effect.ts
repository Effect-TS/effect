// An operation is a function, not an Effect: it has to be called.
import * as Effect from "effect/Effect"
import * as FileSystem from "../../src/FileSystem.ts"

export const mapped = Effect.map(FileSystem.readFile, (bytes) => bytes.length)

export const program = Effect.gen(function*() {
  const bytes = yield* FileSystem.readFile
  return bytes
})
