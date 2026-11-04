import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/copy"

/**
 * The Node implementation of `FileSystem.copy`, as a layer for its operation.
 */
export const copy = Layer.succeed(
  FileSystem.copy.service,
  (from, to, options) => tryFs(M, () => fs.cp(from, to, { recursive: true, force: options?.overwrite ?? false }))
)
