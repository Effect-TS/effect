import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import { failure } from "./internal.ts"

/** The implementation of `FileSystem.writeFile`, as a layer for its operation. */
export const writeFile = Layer.succeed(
  FileSystem.writeFile,
  (path, data) =>
    Effect.tryPromise({
      try: () => fs.writeFile(path, data),
      catch: failure("writeFile", "fixture/FileSystem/writeFile", path)
    })
)
