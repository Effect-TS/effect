import { effectify } from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { handleBadArgument } from "./shared.ts"

const makeDirectory = ((): FileSystem.Shape["makeDirectory"] => {
  const nodeMkdir = effectify(
    NFS.mkdir,
    handleErrnoException("FileSystem", "makeDirectory"),
    handleBadArgument("makeDirectory")
  )
  return (path, options) =>
    nodeMkdir(path, {
      recursive: options?.recursive ?? false,
      mode: options?.mode
    })
})()

/** @internal */
export const layer = Layer.succeed(FileSystem.makeDirectory, makeDirectory)
