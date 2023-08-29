/**
 * @since 1.0.0
 */
import type * as Context from "@effect/data/Context"
import type * as Option from "@effect/data/Option"
import type * as Effect from "@effect/io/Effect"
import type * as Layer from "@effect/io/Layer"
import type * as PlatformError from "@effect/platform/Error"
import type * as FileSystem from "@effect/platform/FileSystem"
import * as internal from "@effect/platform/internal/keyValueStore"
import type * as Path from "@effect/platform/Path"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface KeyValueStore {
  readonly [TypeId]: TypeId
  /**
   * Returns the value of the specified key if it exists.
   */
  readonly get: (key: string) => Effect.Effect<never, PlatformError.PlatformError, Option.Option<string>>

  /**
   * Sets the value of the specified key.
   */
  readonly set: (key: string, value: string) => Effect.Effect<never, PlatformError.PlatformError, void>

  /**
   * Removes the specified key.
   */
  readonly remove: (key: string) => Effect.Effect<never, PlatformError.PlatformError, void>

  /**
   * Removes all entries.
   */
  readonly clear: Effect.Effect<never, PlatformError.PlatformError, void>

  /**
   * Returns the number of entries.
   */
  readonly size: Effect.Effect<never, PlatformError.PlatformError, number>

  /**
   * Updates the value of the specified key if it exists.
   */
  readonly modify: (
    key: string,
    f: (value: string) => string
  ) => Effect.Effect<never, PlatformError.PlatformError, Option.Option<string>>

  /**
   * Returns true if the KeyValueStore contains the specified key.
   */
  readonly has: (key: string) => Effect.Effect<never, PlatformError.PlatformError, boolean>

  /**
   * Checks if the KeyValueStore contains any entries.
   */
  readonly isEmpty: Effect.Effect<never, PlatformError.PlatformError, boolean>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const KeyValueStore: Context.Tag<KeyValueStore, KeyValueStore> = internal.tag

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  impl: Omit<KeyValueStore, typeof TypeId | "has" | "modify" | "isEmpty"> & Partial<KeyValueStore>
) => KeyValueStore = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layerMemory: Layer.Layer<never, never, KeyValueStore> = internal.layerMemory

/**
 * @since 1.0.0
 * @category layers
 */
export const layerFileSystem: (
  directory: string
) => Layer.Layer<FileSystem.FileSystem | Path.Path, PlatformError.PlatformError, KeyValueStore> =
  internal.layerFileSystem
