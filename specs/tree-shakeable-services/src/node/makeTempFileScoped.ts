import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as Path from "node:path"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/makeTempFileScoped"

/**
 * The Node implementation of `FileSystem.makeTempFileScoped`, as a layer for its operation.
 */
export const makeTempFileScoped = Layer.succeed(
  FileSystem.makeTempFileScoped.service,
  (options) =>
    Effect.acquireRelease(
      tryFs(M, async () => {
        const directory = await fs.mkdtemp(Path.join(os.tmpdir(), options?.prefix ?? "effect-"))
        const file = Path.join(directory, "file")
        await fs.writeFile(file, new Uint8Array())
        return file
      }),
      (file) => Effect.promise(() => fs.rm(Path.dirname(file), { recursive: true, force: true }))
    )
)
