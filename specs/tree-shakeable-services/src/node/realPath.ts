import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/realPath"

/**
 * The Node implementation of `FileSystem.realPath`, as a layer for its operation.
 */
export const realPath = Layer.succeed(
  FileSystem.realPath.service,
  (path) => tryFs(M, () => fs.realpath(path))
)
