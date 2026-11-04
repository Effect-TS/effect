/**
 * A program that names a subset record as its one requirement. `ReadOnly` is
 * a record service over `exists`, `readFile` and `stat`; annotating with it
 * keeps the public type short and stable, and a caller provides either those
 * three member layers or a whole file system.
 *
 *   Effect<number, FileSystemError, FileSystem.ReadOnly>
 */
import * as Effect from "effect/Effect"
import * as FileSystem from "./FileSystem.ts"

export const sizeOf = (path: string): Effect.Effect<number, FileSystem.FileSystemError, FileSystem.ReadOnly> =>
  Effect.gen(function*() {
    if (!(yield* FileSystem.exists(path))) return 0
    const info = yield* FileSystem.stat(path)
    const bytes = yield* FileSystem.readFile(path)
    return Math.max(info.size, bytes.length)
  })
