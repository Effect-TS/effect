import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Open from "./open.ts"

/** @internal */
export const layer: Layer.Layer<"effect/FileSystem/stream"> = Layer.provide(
  FileSystem.layerStream,
  Open.layer
)
