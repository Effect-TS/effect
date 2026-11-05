import { effectify } from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { handleBadArgument } from "./shared.ts"

const link = (() => {
  const nodeLink = effectify(
    NFS.link,
    handleErrnoException("FileSystem", "link"),
    handleBadArgument("link")
  )
  return (existingPath: string, newPath: string) => nodeLink(existingPath, newPath)
})()

/** @internal */
export const layer = Layer.succeed(FileSystem.link, link)
