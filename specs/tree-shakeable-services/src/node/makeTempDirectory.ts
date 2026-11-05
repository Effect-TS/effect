import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as Path from "node:path"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/makeTempDirectory"

/**
 * The Node implementation of `FileSystem.makeTempDirectory`, as a layer for its operation.
 */
export const makeTempDirectory = Layer.succeed(
  FileSystem.makeTempDirectory,
  (options) => tryFs(M, () => fs.mkdtemp(Path.join(os.tmpdir(), options?.prefix ?? "effect-")))
)
