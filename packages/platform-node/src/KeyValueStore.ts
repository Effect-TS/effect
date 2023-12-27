/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/KeyValueStore`](https://effect-ts.github.io/platform/platform/KeyValueStore.ts.html).
 */
import type * as PlatformError from "@effect/platform/Error"
import * as KeyValueStore from "@effect/platform/KeyValueStore"
import * as Layer from "effect/Layer"
import * as FileSystem from "./FileSystem.js"
import * as Path from "./Path.js"

/**
 * @since 1.0.0
 */
export * from "@effect/platform/KeyValueStore"

/**
 * @since 1.0.0
 * @category layers
 */
export const layerFileSystem: (
  directory: string
) => Layer.Layer<never, PlatformError.PlatformError, KeyValueStore.KeyValueStore> = (directory: string) =>
  Layer.provide(
    KeyValueStore.layerFileSystem(directory),
    Layer.merge(FileSystem.layer, Path.layer)
  )
