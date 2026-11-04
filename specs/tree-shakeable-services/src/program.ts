/**
 * A program that uses two of the thirty file system operations.
 *
 * Its requirements name exactly the operations it calls:
 *
 *   Effect<void, FileSystemError, "effect/FileSystem/readFile" | "effect/FileSystem/writeFile">
 */
import * as Effect from "effect/Effect"
import * as FileSystem from "./FileSystem.ts"

export const backup = (path: string) =>
  Effect.gen(function*() {
    const bytes = yield* FileSystem.readFile(path)
    yield* FileSystem.writeFile(`${path}.bak`, bytes)
    return bytes.length
  })
