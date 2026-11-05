import { effectify } from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { handleBadArgument } from "./shared.ts"

const realPath = (() => {
  const nodeRealPath = effectify(
    process.platform === "win32" ? NFS.realpath.native : NFS.realpath,
    handleErrnoException("FileSystem", "realPath"),
    handleBadArgument("realPath")
  )
  return (path: string) => nodeRealPath(path)
})()

/** @internal */
export const layer = Layer.succeed(FileSystem.realPath, realPath)
