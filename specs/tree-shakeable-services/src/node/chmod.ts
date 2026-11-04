import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/chmod"

/**
 * The Node implementation of `FileSystem.chmod`, as a layer for its operation.
 */
export const chmod = Layer.succeed(
  FileSystem.chmod.service,
  (path, mode) => tryFs(M, () => fs.chmod(path, mode))
)
