import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as ReadDirectoryEntries from "./readDirectoryEntries.ts"
import * as ReadLink from "./readLink.ts"
import * as Stat from "./stat.ts"

/** @internal */
export const layer: Layer.Layer<"effect/FileSystem/glob"> = Layer.provide(
  FileSystem.layerGlob,
  [ReadDirectoryEntries.layer, ReadLink.layer, Stat.layer]
)
