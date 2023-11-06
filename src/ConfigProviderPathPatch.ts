/**
 * @since 2.0.0
 */
import * as internal from "./internal/configProvider/pathPatch.js"

/**
 * Represents a description of how to modify the path to a configuration
 * value.
 *
 * @since 2.0.0
 * @category models
 */
export type PathPatch = Empty | AndThen | MapName | Nested | Unnested

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
  readonly first: PathPatch
  readonly second: PathPatch
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
export const empty: PathPatch = internal.empty

/**
 * @since 2.0.0
 * @category constructors
 */
export const andThen: {
  (that: PathPatch): (self: PathPatch) => PathPatch
  (self: PathPatch, that: PathPatch): PathPatch
} = internal.andThen

/**
 * @since 2.0.0
 * @category constructors
 */
export const mapName: {
  (f: (string: string) => string): (self: PathPatch) => PathPatch
  (self: PathPatch, f: (string: string) => string): PathPatch
} = internal.mapName

/**
 * @since 2.0.0
 * @category constructors
 */
export const nested: {
  (name: string): (self: PathPatch) => PathPatch
  (self: PathPatch, name: string): PathPatch
} = internal.nested

/**
 * @since 2.0.0
 * @category constructors
 */
export const unnested: {
  (name: string): (self: PathPatch) => PathPatch
  (self: PathPatch, name: string): PathPatch
} = internal.unnested
