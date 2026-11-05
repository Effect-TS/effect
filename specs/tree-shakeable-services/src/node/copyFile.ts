import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/copyFile"

/**
 * The Node implementation of `FileSystem.copyFile`, as a layer for its operation.
 */
export const copyFile = Layer.succeed(
  FileSystem.copyFile,
  (from, to) => tryFs(M, () => fs.copyFile(from, to))
)
