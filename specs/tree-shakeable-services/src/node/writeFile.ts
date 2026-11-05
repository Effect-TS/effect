import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/writeFile"

/**
 * The Node implementation of `FileSystem.writeFile`, as a layer for its operation.
 */
export const writeFile = Layer.succeed(
  FileSystem.writeFile,
  (path, data, options) => tryFs(M, () => fs.writeFile(path, data, { mode: options?.mode }))
)
