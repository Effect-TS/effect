import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as ReadFile from "./readFile.ts"

/** @internal */
export const layer: Layer.Layer<"effect/FileSystem/readFileString"> = Layer.provide(
  FileSystem.layerReadFileString,
  ReadFile.layer
)
