import { effectify } from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { handleBadArgument } from "./shared.ts"

const copyFile = (() => {
  const nodeCopyFile = effectify(
    NFS.copyFile,
    handleErrnoException("FileSystem", "copyFile"),
    handleBadArgument("copyFile")
  )
  return (fromPath: string, toPath: string) => nodeCopyFile(fromPath, toPath)
})()

/** @internal */
export const layer = Layer.succeed(FileSystem.copyFile, copyFile)
