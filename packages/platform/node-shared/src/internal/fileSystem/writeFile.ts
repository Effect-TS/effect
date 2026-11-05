import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import { writeFile } from "./shared.ts"

/** @internal */
export const layer = Layer.succeed(FileSystem.writeFile, writeFile)
