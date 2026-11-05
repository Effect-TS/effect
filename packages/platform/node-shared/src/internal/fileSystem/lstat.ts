import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { statFactory } from "./shared.ts"

const lstat = statFactory("lstat", NFS.lstat)

/** @internal */
export const layer = Layer.succeed(FileSystem.lstat, lstat)
