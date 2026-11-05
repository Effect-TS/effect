import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { fileType } from "./shared.ts"

const readDirectoryEntries = (path: string) =>
  Effect.tryPromise({
    try: () => NFS.promises.readdir(path, { withFileTypes: true }),
    catch: (err) => handleErrnoException("FileSystem", "readDirectoryEntries")(err as any, [path])
  }).pipe(
    Effect.map((entries) =>
      entries.map((entry): FileSystem.DirectoryEntry => ({ name: entry.name, type: fileType(entry) }))
    )
  )

/** @internal */
export const layer = Layer.succeed(FileSystem.readDirectoryEntries, readDirectoryEntries)
