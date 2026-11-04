import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/rename"

/**
 * The Node implementation of `FileSystem.rename`, as a layer for its operation.
 */
export const rename = Layer.succeed(
  FileSystem.rename.service,
  (from, to) => tryFs(M, () => fs.rename(from, to))
)
