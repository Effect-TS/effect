import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import type * as Error from "effect/PlatformError"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { handleBadArgument } from "./shared.ts"

const readFile = (path: string) =>
  Effect.callback<Uint8Array, Error.PlatformError>((resume, signal) => {
    try {
      NFS.readFile(path, { signal }, (err, data) => {
        if (err) {
          resume(Effect.fail(handleErrnoException("FileSystem", "readFile")(err, [path])))
        } else {
          resume(Effect.succeed(data))
        }
      })
    } catch (err) {
      resume(Effect.fail(handleBadArgument("readFile")(err)))
    }
  })

/** @internal */
export const layer = Layer.succeed(FileSystem.readFile, readFile)
