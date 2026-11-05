import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as NFS from "node:fs"
import { statFactory } from "./shared.ts"

const stat = statFactory("stat", NFS.stat)

/** @internal */
export const layer = Layer.succeed(FileSystem.stat, stat)
