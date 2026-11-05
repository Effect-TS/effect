import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/truncate"

/**
 * The Node implementation of `FileSystem.truncate`, as a layer for its operation.
 */
export const truncate = Layer.succeed(
  FileSystem.truncate,
  (path, length) => tryFs(M, () => fs.truncate(path, length))
)
