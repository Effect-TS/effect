import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/utimes"

/**
 * The Node implementation of `FileSystem.utimes`, as a layer for its operation.
 */
export const utimes = Layer.succeed(
  FileSystem.utimes,
  (path, atime, mtime) => tryFs(M, () => fs.utimes(path, atime, mtime))
)
