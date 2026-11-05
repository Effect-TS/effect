import { effectify } from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { handleBadArgument } from "./shared.ts"

const access = ((): FileSystem.Shape["access"] => {
  const nodeAccess = effectify(
    NFS.access,
    handleErrnoException("FileSystem", "access"),
    handleBadArgument("access")
  )
  return (path, options) => {
    let mode = NFS.constants.F_OK
    if (options?.readable) {
      mode |= NFS.constants.R_OK
    }
    if (options?.writable) {
      mode |= NFS.constants.W_OK
    }
    return nodeAccess(path, mode)
  }
})()

/** @internal */
export const layer = Layer.succeed(FileSystem.access, access)
