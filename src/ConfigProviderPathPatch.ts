/**
 * @since 2.0.0
 */
import type { AndThen, Empty, MapName, Nested, Unnested } from "./impl/ConfigProviderPathPatch.js"

/**
 * @since 2.0.0
 */
export * from "./impl/ConfigProviderPathPatch.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/ConfigProviderPathPatch.js"

/**
 * Represents a description of how to modify the path to a configuration
 * value.
 *
 * @since 2.0.0
 * @category models
 */
export type ConfigProviderPathPatch = Empty | AndThen | MapName | Nested | Unnested

/**
 * @since 2.0.0
 */
export declare namespace ConfigProviderPathPatch {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ConfigProviderPathPatch.js"
}
