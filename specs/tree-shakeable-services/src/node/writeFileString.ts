import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/writeFileString"

/**
 * The Node implementation of `FileSystem.writeFileString`, as a layer for its operation.
 */
export const writeFileString = Layer.succeed(
  FileSystem.writeFileString,
  (path, data) => tryFs(M, () => fs.writeFile(path, data, "utf8"))
)
