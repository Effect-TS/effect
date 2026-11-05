import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/readDirectoryEntries"

/**
 * The Node implementation of `FileSystem.readDirectoryEntries`, as a layer for its operation.
 */
export const readDirectoryEntries = Layer.succeed(
  FileSystem.readDirectoryEntries,
  (path) =>
    tryFs(M, () => fs.readdir(path, { withFileTypes: true })).pipe(
      Effect.map((entries) =>
        entries.map((entry) => ({
          name: entry.name,
          type: entry.isFile()
            ? "File"
            : entry.isDirectory()
            ? "Directory"
            : entry.isSymbolicLink()
            ? "SymbolicLink"
            : "Other"
        } as const))
      )
    )
)
