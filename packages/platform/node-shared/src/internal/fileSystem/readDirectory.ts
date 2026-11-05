import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"

const readDirectory: FileSystem.Shape["readDirectory"] = (path, options) =>
  Effect.tryPromise({
    try: () => NFS.promises.readdir(path, options),
    catch: (err) => handleErrnoException("FileSystem", "readDirectory")(err as any, [path])
  })

/** @internal */
export const layer = Layer.succeed(FileSystem.readDirectory, readDirectory)
