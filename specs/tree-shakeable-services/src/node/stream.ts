import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import { createReadStream } from "node:fs"
import * as FileSystem from "../FileSystem.ts"
import { FileSystemError } from "../FileSystem.ts"

const M = "node/FileSystem/stream"

/**
 * The Node implementation of `FileSystem.stream`, as a layer for its operation.
 */
export const stream = Layer.succeed(
  FileSystem.stream.service,
  (path, options) =>
    Stream.fromAsyncIterable(
      createReadStream(path, { highWaterMark: options?.chunkSize ?? 64 * 1024 }),
      (cause) => new FileSystemError({ operation: M, cause })
    ).pipe(Stream.map((chunk) => new Uint8Array(chunk as Buffer)))
)
