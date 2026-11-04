import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/symlink"

/**
 * The Node implementation of `FileSystem.symlink`, as a layer for its operation.
 */
export const symlink = Layer.succeed(
  FileSystem.symlink.service,
  (target, path) => tryFs(M, () => fs.symlink(target, path))
)
