import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import { failure } from "./internal.ts"

/** The implementation of `FileSystem.readFile`, as a layer for its operation. */
export const readFile = Layer.succeed(
  FileSystem.readFile,
  (path) =>
    Effect.tryPromise({ try: () => fs.readFile(path), catch: failure("readFile", "fixture/FileSystem/readFile", path) })
      .pipe(Effect.map((buffer) => new Uint8Array(buffer)))
)
