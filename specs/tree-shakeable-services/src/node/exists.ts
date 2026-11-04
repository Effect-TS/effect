import * as Layer from "effect/Layer"
import * as fs from "node:fs/promises"
import * as FileSystem from "../FileSystem.ts"
import { tryFs } from "./internal.ts"

const M = "node/FileSystem/exists"

/**
 * The Node implementation of `FileSystem.exists`, as a layer for its operation.
 */
export const exists = Layer.succeed(
  FileSystem.exists.service,
  (path) =>
    tryFs(M, () =>
      fs.access(path).then(() => true, (error) => {
        if (error?.code === "ENOENT") return false
        throw error
      }))
)
