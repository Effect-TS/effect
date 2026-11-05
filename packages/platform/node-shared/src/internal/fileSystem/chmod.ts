import { effectify } from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { handleBadArgument } from "./shared.ts"

const chmod = (() => {
  const nodeChmod = effectify(
    NFS.chmod,
    handleErrnoException("FileSystem", "chmod"),
    handleBadArgument("chmod")
  )
  return (path: string, mode: number) => nodeChmod(path, mode)
})()

/** @internal */
export const layer = Layer.succeed(FileSystem.chmod, chmod)
