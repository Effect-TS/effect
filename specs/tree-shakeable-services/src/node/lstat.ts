import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { toInfo, tryFs } from "./internal.ts"

const M = "node/FileSystem/lstat"

/**
 * The Node implementation of `FileSystem.lstat`, as a layer for its operation.
 */
export const lstat = Layer.succeed(
  FileSystem.lstat,
  (path) => tryFs(M, () => fs.lstat(path)).pipe(Effect.map(toInfo))
)
