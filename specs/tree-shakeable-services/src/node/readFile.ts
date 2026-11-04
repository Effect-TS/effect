import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/readFile"

/**
 * The Node implementation of `FileSystem.readFile`, as a layer for its operation.
 */
export const readFile = Layer.succeed(
  FileSystem.readFile.service,
  (path) => tryFs(M, () => fs.readFile(path)).pipe(Effect.map((buffer) => new Uint8Array(buffer)))
)
