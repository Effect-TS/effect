import type { ConfigProviderPathPatch } from "../ConfigProviderPathPatch.js"
import * as internal from "../internal/configProvider/pathPatch.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface Empty {
  readonly _tag: "Empty"
}

/**
 * @since 2.0.0
 * @category models
 */
export interface AndThen {
  readonly _tag: "AndThen"
  readonly first: ConfigProviderPathPatch
  readonly second: ConfigProviderPathPatch
}

/**
 * @since 2.0.0
 * @category models
 */
export interface MapName {
  readonly _tag: "MapName"
  readonly f: (string: string) => string
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Nested {
  readonly _tag: "Nested"
  readonly name: string
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Unnested {
  readonly _tag: "Unnested"
  readonly name: string
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const empty: ConfigProviderPathPatch = internal.empty

/**
 * @since 2.0.0
 * @category constructors
 */
export const andThen: {
  (that: ConfigProviderPathPatch): (self: ConfigProviderPathPatch) => ConfigProviderPathPatch
  (self: ConfigProviderPathPatch, that: ConfigProviderPathPatch): ConfigProviderPathPatch
} = internal.andThen

/**
 * @since 2.0.0
 * @category constructors
 */
export const mapName: {
  (f: (string: string) => string): (self: ConfigProviderPathPatch) => ConfigProviderPathPatch
  (self: ConfigProviderPathPatch, f: (string: string) => string): ConfigProviderPathPatch
} = internal.mapName

/**
 * @since 2.0.0
 * @category constructors
 */
export const nested: {
  (name: string): (self: ConfigProviderPathPatch) => ConfigProviderPathPatch
  (self: ConfigProviderPathPatch, name: string): ConfigProviderPathPatch
} = internal.nested

/**
 * @since 2.0.0
 * @category constructors
 */
export const unnested: {
  (name: string): (self: ConfigProviderPathPatch) => ConfigProviderPathPatch
  (self: ConfigProviderPathPatch, name: string): ConfigProviderPathPatch
} = internal.unnested
