import { effectify } from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { handleBadArgument } from "./shared.ts"

const utimes = (() => {
  const nodeUtimes = effectify(
    NFS.utimes,
    handleErrnoException("FileSystem", "utime"),
    handleBadArgument("utime")
  )
  return (path: string, atime: number | Date, mtime: number | Date) => nodeUtimes(path, atime, mtime)
})()

/** @internal */
export const layer = Layer.succeed(FileSystem.utimes, utimes)
