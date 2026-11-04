import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/readLink"

/**
 * The Node implementation of `FileSystem.readLink`, as a layer for its operation.
 */
export const readLink = Layer.succeed(
  FileSystem.readLink.service,
  (path) => tryFs(M, () => fs.readlink(path))
)
