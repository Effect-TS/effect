import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Access from "./access.ts"

/** @internal */
export const layer: Layer.Layer<"effect/FileSystem/exists"> = Layer.provide(
  FileSystem.layerExists,
  Access.layer
)
