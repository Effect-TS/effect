import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/makeDirectory"

/**
 * The Node implementation of `FileSystem.makeDirectory`, as a layer for its operation.
 */
export const makeDirectory = Layer.succeed(
  FileSystem.makeDirectory.service,
  (path, options) => tryFs(M, () => fs.mkdir(path, { recursive: options?.recursive ?? false })).pipe(Effect.asVoid)
)
