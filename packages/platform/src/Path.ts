/**
 * @since 1.0.0
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { BadArgument } from "./Error.js"
import * as internal from "./internal/path.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category tag
 */
export class Path extends Effect.Tag("@effect/platform/Path")<
  Path,
  {
    readonly [TypeId]: TypeId
    readonly sep: string
    readonly basename: (path: string, suffix?: string) => string
    readonly dirname: (path: string) => string
    readonly extname: (path: string) => string
    readonly format: (pathObject: Partial<Path.Parsed>) => string
    readonly fromFileUrl: (url: URL) => Effect.Effect<string, BadArgument>
    readonly isAbsolute: (path: string) => boolean
    readonly join: (...paths: ReadonlyArray<string>) => string
    readonly normalize: (path: string) => string
    readonly parse: (path: string) => Path.Parsed
    readonly relative: (from: string, to: string) => string
    readonly resolve: (...pathSegments: ReadonlyArray<string>) => string
    readonly toFileUrl: (path: string) => Effect.Effect<URL, BadArgument>
    readonly toNamespacedPath: (path: string) => string
  }
>() {}

/**
 * @since 1.0.0
 */
export declare namespace Path {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Parsed {
    readonly root: string
    readonly dir: string
    readonly base: string
    readonly ext: string
    readonly name: string
  }
}

/**
 * An implementation of the Path interface that can be used in all environments
 * (including browsers).
 *
 * It uses the POSIX standard for paths.
 *
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer.Layer<Path> = Layer.succeed(Path, internal.posixImpl)
