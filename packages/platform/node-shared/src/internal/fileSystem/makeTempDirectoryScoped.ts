import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import { makeTempDirectoryFactory, removeFactory } from "./shared.ts"

const makeTempDirectoryScoped = ((): FileSystem.Shape["makeTempDirectoryScoped"] => {
  const makeDirectory = makeTempDirectoryFactory("makeTempDirectoryScoped")
  const removeDirectory = removeFactory("makeTempDirectoryScoped")
  return (options) =>
    Effect.acquireRelease(
      makeDirectory(options),
      (directory) => Effect.orDie(removeDirectory(directory, { recursive: true, force: true }))
    )
})()

/** @internal */
export const layer = Layer.succeed(FileSystem.makeTempDirectoryScoped, makeTempDirectoryScoped)
