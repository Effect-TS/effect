import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import * as fs from "node:fs/promises"
import * as Path from "node:path"
import * as FileSystem from "../FileSystem.ts"
import { FileSystemError } from "../FileSystem.ts"

const M = "node/FileSystem/watch"

/**
 * The Node implementation of `FileSystem.watch`, as a layer for its operation.
 */
export const watch = Layer.succeed(
  FileSystem.watch,
  (path) =>
    Stream.fromAsyncIterable(fs.watch(path), (cause) => new FileSystemError({ operation: M, cause })).pipe(
      Stream.map((event) => ({
        kind: event.eventType === "rename" ? "Remove" : "Update",
        path: Path.join(path, String(event.filename ?? ""))
      } as const))
    )
)
