import { effectify } from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { handleBadArgument } from "./shared.ts"

const symlink = (() => {
  const nodeSymlink = effectify(
    NFS.symlink,
    handleErrnoException("FileSystem", "symlink"),
    handleBadArgument("symlink")
  )
  return (target: string, path: string) => nodeSymlink(target, path)
})()

/** @internal */
export const layer = Layer.succeed(FileSystem.symlink, symlink)
