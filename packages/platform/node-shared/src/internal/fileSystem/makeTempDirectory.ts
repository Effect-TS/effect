import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import { makeTempDirectoryFactory } from "./shared.ts"

const makeTempDirectory = makeTempDirectoryFactory("makeTempDirectory")

/** @internal */
export const layer = Layer.succeed(FileSystem.makeTempDirectory, makeTempDirectory)
