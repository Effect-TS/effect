import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/readDirectory"

/**
 * The Node implementation of `FileSystem.readDirectory`, as a layer for its operation.
 */
export const readDirectory = Layer.succeed(
  FileSystem.readDirectory,
  (path) => tryFs(M, () => fs.readdir(path))
)
