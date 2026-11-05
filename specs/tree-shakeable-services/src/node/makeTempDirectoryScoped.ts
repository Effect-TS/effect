import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as Path from "node:path"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/makeTempDirectoryScoped"

/**
 * The Node implementation of `FileSystem.makeTempDirectoryScoped`, as a layer for its operation.
 */
export const makeTempDirectoryScoped = Layer.succeed(
  FileSystem.makeTempDirectoryScoped,
  (options) =>
    Effect.acquireRelease(
      tryFs(M, () => fs.mkdtemp(Path.join(os.tmpdir(), options?.prefix ?? "effect-"))),
      (directory) => Effect.promise(() => fs.rm(directory, { recursive: true, force: true }))
    )
)
