import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/link"

/**
 * The Node implementation of `FileSystem.link`, as a layer for its operation.
 */
export const link = Layer.succeed(
  FileSystem.link,
  (from, to) => tryFs(M, () => fs.link(from, to))
)
