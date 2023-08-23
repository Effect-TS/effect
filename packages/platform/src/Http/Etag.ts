/**
 * @since 1.0.0
 */
import type * as Context from "@effect/data/Context"
import type * as Effect from "@effect/io/Effect"
import type * as FileSystem from "@effect/platform/FileSystem"
import * as internal from "@effect/platform/internal/http/etag"

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
export interface Generator {
  readonly [GeneratorTypeId]: GeneratorTypeId
  readonly fromFileInfo: (info: FileSystem.File.Info) => Effect.Effect<never, never, Etag>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Generator: Context.Tag<Generator, Generator> = internal.tag
