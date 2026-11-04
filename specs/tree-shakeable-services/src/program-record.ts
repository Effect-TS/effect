/**
 * A program that yields the whole file system as a record, as code written
 * against a record service does today.
 *
 * Its requirement is the record's identity, which only a provider of every
 * operation can satisfy:
 *
 *   Effect<number, FileSystemError, FileSystem>
 */
import * as Effect from "effect/Effect"
import { FileSystem } from "./FileSystem.ts"

export const backupViaRecord = (path: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem
    const bytes = yield* fs.readFile(path)
    yield* fs.writeFile(`${path}.bak`, bytes)
    return bytes.length
  })
