import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import { removeFactory } from "./shared.ts"

const remove = removeFactory("remove")

/** @internal */
export const layer = Layer.succeed(FileSystem.remove, remove)
