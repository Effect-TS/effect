import { effectify } from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { handleBadArgument } from "./shared.ts"

const chown = (() => {
  const nodeChown = effectify(
    NFS.chown,
    handleErrnoException("FileSystem", "chown"),
    handleBadArgument("chown")
  )
  return (path: string, uid: number, gid: number) => nodeChown(path, uid, gid)
})()

/** @internal */
export const layer = Layer.succeed(FileSystem.chown, chown)
