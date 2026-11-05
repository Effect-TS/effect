import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/remove"

/**
 * The Node implementation of `FileSystem.remove`, as a layer for its operation.
 */
export const remove = Layer.succeed(
  FileSystem.remove,
  (path, options) =>
    tryFs(M, () => fs.rm(path, { recursive: options?.recursive ?? false, force: options?.force ?? false }))
)
