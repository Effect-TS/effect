import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import { makeTempFileFactory } from "./shared.ts"

const makeTempFile = makeTempFileFactory("makeTempFile")

/** @internal */
export const layer = Layer.succeed(FileSystem.makeTempFile, makeTempFile)
