/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import type * as PlatformError from "./Error.js"
import type * as FileSystem from "./FileSystem.js"
import * as internal from "./internal/keyValueStore.js"
import type * as Path from "./Path.js"

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

  /**
   * Create a SchemaStore for the specified schema.
   */
  readonly forSchema: <I, A>(schema: Schema.Schema<I, A>) => SchemaStore<A>
}

/**
 * @since 1.0.0
 */
export declare namespace KeyValueStore {
  /**
   * @since 1.0.0
   */
  export type AnyStore = KeyValueStore | SchemaStore<any>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const KeyValueStore: Context.Tag<KeyValueStore, KeyValueStore> = internal.keyValueStoreTag

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  impl: Omit<KeyValueStore, typeof TypeId | "has" | "modify" | "isEmpty" | "forSchema"> & Partial<KeyValueStore>
) => KeyValueStore = internal.make

/**
 * @since 1.0.0
 * @category combinators
 */
export const prefix: {
  (prefix: string): <S extends KeyValueStore.AnyStore>(self: S) => S
  <S extends KeyValueStore.AnyStore>(self: S, prefix: string): S
} = internal.prefix

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

/**
 * @since 1.0.0
 * @category type id
 */
export const SchemaStoreTypeId: unique symbol = internal.SchemaStoreTypeId

/**
 * @since 1.0.0
 * @category type id
 */
export type SchemaStoreTypeId = typeof SchemaStoreTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface SchemaStore<A> {
  readonly [SchemaStoreTypeId]: SchemaStoreTypeId
  /**
   * Returns the value of the specified key if it exists.
   */
  readonly get: (
    key: string
  ) => Effect.Effect<never, PlatformError.PlatformError | ParseResult.ParseError, Option.Option<A>>

  /**
   * Sets the value of the specified key.
   */
  readonly set: (
    key: string,
    value: A
  ) => Effect.Effect<never, PlatformError.PlatformError | ParseResult.ParseError, void>

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
    f: (value: A) => A
  ) => Effect.Effect<never, PlatformError.PlatformError | ParseResult.ParseError, Option.Option<A>>

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
 * @category layers
 */
export const layerSchema: <I, A>(
  schema: Schema.Schema<I, A>,
  tagIdentifier?: unknown
) => {
  readonly tag: Context.Tag<SchemaStore<A>, SchemaStore<A>>
  readonly layer: Layer.Layer<KeyValueStore, never, SchemaStore<A>>
} = internal.layerSchema
