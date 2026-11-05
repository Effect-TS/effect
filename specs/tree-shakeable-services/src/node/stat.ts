import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { toInfo, tryFs } from "./internal.ts"

const M = "node/FileSystem/stat"

/**
 * The Node implementation of `FileSystem.stat`, as a layer for its operation.
 */
export const stat = Layer.succeed(
  FileSystem.stat,
  (path) => tryFs(M, () => fs.stat(path)).pipe(Effect.map(toInfo))
)
