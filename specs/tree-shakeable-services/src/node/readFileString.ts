import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/readFileString"

/**
 * The Node implementation of `FileSystem.readFileString`, as a layer for its operation.
 */
export const readFileString = Layer.succeed(
  FileSystem.readFileString,
  (path, encoding) => tryFs(M, () => fs.readFile(path, { encoding: encoding ?? "utf8" }))
)
