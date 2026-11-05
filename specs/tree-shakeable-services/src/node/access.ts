import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/access"

/**
 * The Node implementation of `FileSystem.access`, as a layer for its operation.
 */
export const access = Layer.succeed(
  FileSystem.access,
  (path, options) =>
    tryFs(
      M,
      () => fs.access(path, (options?.readable ? fs.constants.R_OK : 0) | (options?.writable ? fs.constants.W_OK : 0))
    )
)
