/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type * as FileSystem from "./FileSystem.js"
import type * as Body from "./HttpBody.js"
import * as internal from "./internal/etag.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const GeneratorTypeId: unique symbol = internal.GeneratorTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type GeneratorTypeId = typeof GeneratorTypeId

/**
 * @since 1.0.0
 * @category models
 */
export type Etag = Weak | Strong

/**
 * @since 1.0.0
 * @category models
 */
export interface Weak {
  readonly _tag: "Weak"
  readonly value: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Strong {
  readonly _tag: "Strong"
  readonly value: string
}

/**
 * @since 1.0.0
 * @category convertions
 */
export const toString: (self: Etag) => string = internal.toString

/**
 * @since 1.0.0
 * @category tags
 */
export class Generator extends Effect.Tag("@effect/platform/Etag/Generator")<
  Generator,
  {
    readonly [GeneratorTypeId]: GeneratorTypeId
    readonly fromFileInfo: (info: FileSystem.File.Info) => Effect.Effect<Etag>
    readonly fromFileWeb: (file: Body.HttpBody.FileLike) => Effect.Effect<Etag>
  }
>() {}
