import * as Effect from "effect/Effect"
import type * as fs from "node:fs"
import { FileSystemError, type Info } from "../FileSystem.ts"

/** Runs a Node file system call, tagging failures with the implementation that made them. */
export const tryFs = <A>(operation: string, run: () => Promise<A>): Effect.Effect<A, FileSystemError> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new FileSystemError({ operation, cause })
  })

export const toInfo = (stats: fs.Stats): Info => ({
  type: stats.isFile() ? "File" : stats.isDirectory() ? "Directory" : stats.isSymbolicLink() ? "SymbolicLink" : "Other",
  size: stats.size,
  mtime: stats.mtime
})
