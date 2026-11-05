import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/chown"

/**
 * The Node implementation of `FileSystem.chown`, as a layer for its operation.
 */
export const chown = Layer.succeed(
  FileSystem.chown,
  (path, uid, gid) => tryFs(M, () => fs.chown(path, uid, gid))
)
