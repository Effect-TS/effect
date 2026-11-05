import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "node:path"
import { makeTempFileFactory, removeFactory } from "./shared.ts"

const makeTempFileScoped = ((): FileSystem.Shape["makeTempFileScoped"] => {
  const makeFile = makeTempFileFactory("makeTempFileScoped")
  const removeDirectory = removeFactory("makeTempFileScoped")
  return (options) =>
    Effect.acquireRelease(
      makeFile(options),
      (file) => Effect.orDie(removeDirectory(Path.dirname(file), { recursive: true, force: true }))
    )
})()

/** @internal */
export const layer = Layer.succeed(FileSystem.makeTempFileScoped, makeTempFileScoped)
