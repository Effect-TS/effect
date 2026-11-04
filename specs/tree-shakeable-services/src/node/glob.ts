import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { FileSystemError } from "../FileSystem.ts"

const M = "node/FileSystem/glob"

/**
 * The Node implementation of `FileSystem.glob`, as a layer for its operation.
 */
export const glob = Layer.succeed(
  FileSystem.glob.service,
  (pattern, options) =>
    Stream.fromAsyncIterable(
      fs.glob(pattern, { cwd: options?.cwd ?? process.cwd() }),
      (cause) => new FileSystemError({ operation: M, cause })
    )
)
