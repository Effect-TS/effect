/**
 * @since 1.0.0
 */
import * as KVSN from "@effect/platform-node-shared/NodeKeyValueStore"
import type * as PlatformError from "@effect/platform/Error"
import type * as KeyValueStore from "@effect/platform/KeyValueStore"
import type * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 * @category layers
 */
export const layerFileSystem: (
  directory: string
) => Layer.Layer<KeyValueStore.KeyValueStore, PlatformError.PlatformError> = KVSN.layerFileSystem
