/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/KeyValueStore`](https://effect-ts.github.io/platform/platform/KeyValueStore.ts.html).
 */
import * as internal from "./internal/keyValueStore.js"

/**
 * @since 1.0.0
 */
export * from "@effect/platform/KeyValueStore"

/**
 * Creates a KeyValueStore layer that uses the browser's localStorage api. Values are stored between sessions.
 *
 * @since 1.0.0
 * @category models
 */
export const layerLocalStorage = internal.layerLocalStorage

/**
 * Creates a KeyValueStore layer that uses the browser's sessionStorage api. Values are stored only for the current session.
 *
 * @since 1.0.0
 * @category models
 */
export const layerSessionStorage = internal.layerSessionStorage
