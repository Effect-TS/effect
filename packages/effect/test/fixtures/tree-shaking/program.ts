/**
 * A program that calls two of the file system's operations. Its requirements
 * name exactly those two keys.
 */
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"

export const backup = Effect.fnUntraced(function*(path: string) {
  const bytes = yield* FileSystem.readFile(path)
  yield* FileSystem.writeFile(`${path}.bak`, bytes)
  return bytes.length
})
