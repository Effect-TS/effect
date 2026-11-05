import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as WriteFile from "./writeFile.ts"

/** @internal */
export const layer: Layer.Layer<"effect/FileSystem/writeFileString"> = Layer.provide(
  FileSystem.layerWriteFileString,
  WriteFile.layer
)
