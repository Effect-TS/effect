/**
 * @since 1.0.0
 */
import type * as KeyValueStore from "@effect/platform/KeyValueStore"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/keyValueStore.js"

/**
 * Creates a KeyValueStore layer that uses the browser's localStorage api. Values are stored between sessions.
 *
 * @since 1.0.0
 * @category models
 */
export const layerLocalStorage: Layer.Layer<KeyValueStore.KeyValueStore> = internal.layerLocalStorage

/**
 * Creates a KeyValueStore layer that uses the browser's sessionStorage api. Values are stored only for the current session.
 *
 * @since 1.0.0
 * @category models
 */
export const layerSessionStorage: Layer.Layer<KeyValueStore.KeyValueStore> = internal.layerSessionStorage
