/**
 * A program that uses one Stream-returning operation. Its composition root
 * is bundled to show that the Stream runtime is pulled in by the operation
 * that returns a Stream, and only then.
 *
 *   Effect<number, FileSystemError, "effect/FileSystem/stream">
 */
import * as Stream from "effect/Stream"
import * as FileSystem from "./FileSystem.ts"

export const byteCount = (path: string) =>
  FileSystem.stream(path).pipe(
    Stream.map((chunk) => chunk.length),
    Stream.runFold(() => 0, (total, length) => total + length)
  )
