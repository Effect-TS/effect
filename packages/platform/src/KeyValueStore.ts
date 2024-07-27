/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as PlatformError from "./Error.js"
import { FileSystem } from "./FileSystem.js"
import * as internal from "./internal/keyValueStore.js"
import { Path } from "./Path.js"

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
 * @category tags
 */
export class KeyValueStore extends Effect.Tag("@effect/platform/KeyValueStore")<
  KeyValueStore,
  {
    readonly [TypeId]: TypeId
    /**
     * Returns the value of the specified key if it exists.
     */
    readonly get: (key: string) => Effect.Effect<Option.Option<string>, PlatformError.PlatformError>

    /**
     * Sets the value of the specified key.
     */
    readonly set: (key: string, value: string) => Effect.Effect<void, PlatformError.PlatformError>

    /**
     * Removes the specified key.
     */
    readonly remove: (key: string) => Effect.Effect<void, PlatformError.PlatformError>

    /**
     * Removes all entries.
     */
    readonly clear: Effect.Effect<void, PlatformError.PlatformError>

    /**
     * Returns the number of entries.
     */
    readonly size: Effect.Effect<number, PlatformError.PlatformError>

    /**
     * Updates the value of the specified key if it exists.
     */
    readonly modify: (
      key: string,
      f: (value: string) => string
    ) => Effect.Effect<Option.Option<string>, PlatformError.PlatformError>

    /**
     * Returns true if the KeyValueStore contains the specified key.
     */
    readonly has: (key: string) => Effect.Effect<boolean, PlatformError.PlatformError>

    /**
     * Checks if the KeyValueStore contains any entries.
     */
    readonly isEmpty: Effect.Effect<boolean, PlatformError.PlatformError>

    /**
     * Create a SchemaStore for the specified schema.
     */
    readonly forSchema: <A, I, R>(schema: Schema.Schema<A, I, R>) => SchemaStore<A, R>
  }
>() {}

/**
 * @since 1.0.0
 */
export declare namespace KeyValueStore {
  /**
   * @since 1.0.0
   */
  export type AnyStore = typeof KeyValueStore.Service | SchemaStore<any, any>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  impl:
    & Omit<typeof KeyValueStore.Service, typeof TypeId | "has" | "modify" | "isEmpty" | "forSchema">
    & Partial<KeyValueStore>
) => typeof KeyValueStore.Service = internal.make

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
export const layerMemory: Layer.Layer<KeyValueStore> = Layer.sync(KeyValueStore, () => {
  const store = new Map<string, string>()
  return make({
    get: (key: string) => Effect.sync(() => Option.fromNullable(store.get(key))),
    set: (key: string, value: string) => Effect.sync(() => store.set(key, value)),
    remove: (key: string) => Effect.sync(() => store.delete(key)),
    clear: Effect.sync(() => store.clear()),
    size: Effect.sync(() => store.size)
  })
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layerFileSystem = (directory: string) =>
  Layer.effect(
    KeyValueStore,
    Effect.gen(function*() {
      const fs = yield* FileSystem
      const path = yield* Path
      const keyPath = (key: string) => path.join(directory, encodeURIComponent(key))

      if (!(yield* fs.exists(directory))) {
        yield* fs.makeDirectory(directory, { recursive: true })
      }

      return make({
        get: (key: string) =>
          fs.readFileString(keyPath(key)).pipe(
            Effect.map(Option.some),
            Effect.catchTag(
              "SystemError",
              (sysError) => sysError.reason === "NotFound" ? Effect.succeed(Option.none()) : Effect.fail(sysError)
            )
          ),
        set: (key: string, value: string) => fs.writeFileString(keyPath(key), value),
        remove: (key: string) => fs.remove(keyPath(key)),
        clear: Effect.zipRight(
          fs.remove(directory, { recursive: true }),
          fs.makeDirectory(directory, { recursive: true })
        ),
        size: Effect.map(
          fs.readDirectory(directory),
          (files) => files.length
        )
      })
    })
  )

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
export interface SchemaStore<A, R> {
  readonly [SchemaStoreTypeId]: SchemaStoreTypeId
  /**
   * Returns the value of the specified key if it exists.
   */
  readonly get: (
    key: string
  ) => Effect.Effect<Option.Option<A>, PlatformError.PlatformError | ParseResult.ParseError, R>

  /**
   * Sets the value of the specified key.
   */
  readonly set: (
    key: string,
    value: A
  ) => Effect.Effect<void, PlatformError.PlatformError | ParseResult.ParseError, R>

  /**
   * Removes the specified key.
   */
  readonly remove: (key: string) => Effect.Effect<void, PlatformError.PlatformError>

  /**
   * Removes all entries.
   */
  readonly clear: Effect.Effect<void, PlatformError.PlatformError>

  /**
   * Returns the number of entries.
   */
  readonly size: Effect.Effect<number, PlatformError.PlatformError>

  /**
   * Updates the value of the specified key if it exists.
   */
  readonly modify: (
    key: string,
    f: (value: A) => A
  ) => Effect.Effect<Option.Option<A>, PlatformError.PlatformError | ParseResult.ParseError, R>

  /**
   * Returns true if the KeyValueStore contains the specified key.
   */
  readonly has: (key: string) => Effect.Effect<boolean, PlatformError.PlatformError>

  /**
   * Checks if the KeyValueStore contains any entries.
   */
  readonly isEmpty: Effect.Effect<boolean, PlatformError.PlatformError>
}

/**
 * @since 1.0.0
 * @category layers
 */
export const layerSchema = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  tagIdentifier: string
): {
  readonly tag: Context.Tag<SchemaStore<A, R>, SchemaStore<A, R>>
  readonly layer: Layer.Layer<SchemaStore<A, R>, never, KeyValueStore>
} => {
  const tag = Context.GenericTag<SchemaStore<A, R>>(tagIdentifier)
  const layer = Layer.effect(tag, Effect.map(KeyValueStore, (store) => store.forSchema(schema)))
  return { tag, layer } as const
}

/**
 * Creates an KeyValueStorage from an instance of the `Storage` api.
 *
 * @since 1.0.0
 * @category layers
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
 */
export const layerStorage = (
  evaluate: LazyArg<Storage>
): Layer.Layer<KeyValueStore> =>
  Layer.sync(KeyValueStore, () => {
    const storage = evaluate()
    return make({
      get: (key: string) =>
        Effect.try({
          try: () => Option.fromNullable(storage.getItem(key)),
          catch: () =>
            internal.storageError({
              pathOrDescriptor: key,
              method: "get",
              message: `Unable to get item with key ${key}`
            })
        }),

      set: (key: string, value: string) =>
        Effect.try({
          try: () => storage.setItem(key, value),
          catch: () =>
            internal.storageError({
              pathOrDescriptor: key,
              method: "set",
              message: `Unable to set item with key ${key}`
            })
        }),

      remove: (key: string) =>
        Effect.try({
          try: () => storage.removeItem(key),
          catch: () =>
            internal.storageError({
              pathOrDescriptor: key,
              method: "remove",
              message: `Unable to remove item with key ${key}`
            })
        }),

      clear: Effect.try({
        try: () => storage.clear(),
        catch: () =>
          internal.storageError({
            pathOrDescriptor: "clear",
            method: "clear",
            message: `Unable to clear storage`
          })
      }),

      size: Effect.try({
        try: () => storage.length,
        catch: () =>
          internal.storageError({
            pathOrDescriptor: "size",
            method: "size",
            message: `Unable to get size`
          })
      })
    })
  })
