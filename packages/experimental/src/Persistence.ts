/**
 * @since 1.0.0
 */
import * as KeyValueStore from "@effect/platform/KeyValueStore"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Serializable from "@effect/schema/Serializable"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PrimaryKey from "effect/PrimaryKey"
import type * as Scope from "effect/Scope"

/**
 * @since 1.0.0
 * @category errors
 */
export type PersistenceError = PersistenceSchemaError | PersistenceBackingError

/**
 * @since 1.0.0
 * @category errors
 */
export class PersistenceSchemaError extends Data.TaggedError("PersistenceSchemaError")<{
  readonly method: string
  readonly error: ParseResult.ParseError["error"]
}> {}

/**
 * @since 1.0.0
 * @category errors
 */
export class PersistenceBackingError extends Data.TaggedError("PersistenceBackingError")<{
  readonly method: string
  readonly error: unknown
}> {}

/**
 * @since 1.0.0
 * @category type ids
 */
export const BackingPersistenceTypeId = Symbol.for("@effect/experimental/BackingPersistence")

/**
 * @since 1.0.0
 * @category type ids
 */
export type BackingPersistenceTypeId = typeof BackingPersistenceTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface BackingPersistence {
  readonly [BackingPersistenceTypeId]: BackingPersistenceTypeId
  readonly make: (storeId: string) => Effect.Effect<Scope.Scope, never, BackingPersistenceStore>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface BackingPersistenceStore {
  readonly get: (key: string) => Effect.Effect<never, PersistenceError, Option.Option<unknown>>
  readonly getMany: (key: Array<string>) => Effect.Effect<never, PersistenceError, Array<Option.Option<unknown>>>
  readonly set: (key: string, value: unknown) => Effect.Effect<never, PersistenceError, void>
  readonly remove: (key: string) => Effect.Effect<never, PersistenceError, void>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const BackingPersistence: Context.Tag<BackingPersistence, BackingPersistence> = Context.Tag<BackingPersistence>(
  "@effect/experimental/BackingPersistence"
)

/**
 * @since 1.0.0
 * @category type ids
 */
export const ResultPersistenceTypeId = Symbol.for("@effect/experimental/ResultPersistence")

/**
 * @since 1.0.0
 * @category type ids
 */
export type ResultPersistenceTypeId = typeof ResultPersistenceTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface ResultPersistence {
  readonly [ResultPersistenceTypeId]: ResultPersistenceTypeId
  readonly make: (storeId: string) => Effect.Effect<Scope.Scope, never, ResultPersistenceStore>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ResultPersistenceStore {
  readonly get: <R, IE, E, IA, A>(
    key: ResultPersistence.Key<R, IE, E, IA, A>
  ) => Effect.Effect<R, PersistenceError, Option.Option<Exit.Exit<E, A>>>
  readonly getMany: <R, IE, E, IA, A>(
    key: ReadonlyArray<ResultPersistence.Key<R, IE, E, IA, A>>
  ) => Effect.Effect<R, PersistenceError, Array<Option.Option<Exit.Exit<E, A>>>>
  readonly set: <R, IE, E, IA, A>(
    key: ResultPersistence.Key<R, IE, E, IA, A>,
    value: Exit.Exit<E, A>
  ) => Effect.Effect<R, PersistenceError, void>
  readonly remove: <R, IE, E, IA, A>(
    key: ResultPersistence.Key<R, IE, E, IA, A>
  ) => Effect.Effect<never, PersistenceError, void>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace ResultPersistence {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Key<R, IE, E, IA, A> extends PrimaryKey.PrimaryKey, Serializable.WithResult<R, IE, E, IA, A> {
    readonly _tag: string
  }
}

/**
 * @since 1.0.0
 * @category tags
 */
export const ResultPersistence: Context.Tag<ResultPersistence, ResultPersistence> = Context.Tag<ResultPersistence>(
  "@effect/experimental/ResultPersistence"
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerResult = Layer.effect(
  ResultPersistence,
  Effect.gen(function*(_) {
    const backing = yield* _(BackingPersistence)
    return ResultPersistence.of({
      [ResultPersistenceTypeId]: ResultPersistenceTypeId,
      make: (storeId: string) =>
        Effect.gen(function*(_) {
          const storage = yield* _(backing.make(storeId))
          const parse = <R, IE, E, IA, A>(
            method: string,
            key: ResultPersistence.Key<R, IE, E, IA, A>,
            value: unknown
          ) =>
            Effect.mapError(
              Serializable.deserializeExit(key, value),
              (_) => new PersistenceSchemaError({ method, error: _.error })
            )
          const encode = <R, IE, E, IA, A>(
            method: string,
            key: ResultPersistence.Key<R, IE, E, IA, A>,
            value: Exit.Exit<E, A>
          ) =>
            Effect.mapError(
              Serializable.serializeExit(key, value),
              (_) => new PersistenceSchemaError({ method, error: _.error })
            )
          const makeKey = <R, IE, E, IA, A>(
            key: ResultPersistence.Key<R, IE, E, IA, A>
          ) => `${key._tag}:${key[PrimaryKey.symbol]()}`

          return identity<ResultPersistenceStore>({
            get: (key) =>
              Effect.flatMap(
                storage.get(makeKey(key)),
                Option.match({
                  onNone: () => Effect.succeedNone,
                  onSome: (_) => Effect.asSome(parse("get", key, _))
                })
              ),
            getMany: (keys) =>
              Effect.flatMap(
                storage.getMany(keys.map(makeKey)),
                Effect.forEach((result, i) => {
                  const key = keys[i]
                  return Option.match(result, {
                    onNone: () => Effect.succeedNone,
                    onSome: (_) =>
                      parse("getMany", key, _).pipe(
                        Effect.tapError((_) => storage.remove(makeKey(keys[i]))),
                        Effect.option
                      )
                  })
                })
              ),
            set: (key, value) =>
              encode("set", key, value).pipe(
                Effect.flatMap((_) => storage.set(makeKey(key), _))
              ),
            remove: (key) => storage.remove(makeKey(key))
          })
        })
    })
  })
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerMemory: Layer.Layer<never, never, BackingPersistence> = Layer.succeed(
  BackingPersistence,
  BackingPersistence.of({
    [BackingPersistenceTypeId]: BackingPersistenceTypeId,
    make: (_storeId) =>
      Effect.sync(() => {
        const map = new Map<string, unknown>()
        return identity<BackingPersistenceStore>({
          get: (key) => Effect.sync(() => Option.fromNullable(map.get(key))),
          getMany: (keys) => Effect.sync(() => keys.map((key) => Option.fromNullable(map.get(key)))),
          set: (key, value) => Effect.sync(() => map.set(key, value)),
          remove: (key) => Effect.sync(() => map.delete(key))
        })
      })
  })
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerKeyValueStore: Layer.Layer<KeyValueStore.KeyValueStore, never, BackingPersistence> = Layer.effect(
  BackingPersistence,
  Effect.gen(function*(_) {
    const backing = yield* _(KeyValueStore.KeyValueStore)
    return BackingPersistence.of({
      [BackingPersistenceTypeId]: BackingPersistenceTypeId,
      make: (storeId) =>
        Effect.sync(() => {
          const store = KeyValueStore.prefix(backing, storeId)
          const get = (method: string, key: string) =>
            Effect.flatMap(
              Effect.mapError(
                store.get(key),
                (error) => new PersistenceBackingError({ method, error })
              ),
              Option.match({
                onNone: () => Effect.succeedNone,
                onSome: (s) =>
                  Effect.try({
                    try: () => JSON.parse(s),
                    catch: (error) => new PersistenceBackingError({ method, error })
                  })
              })
            )
          return identity<BackingPersistenceStore>({
            get: (key) => get("get", key),
            getMany: (keys) => Effect.forEach(keys, (key) => get("getMany", key)),
            set: (key, value) =>
              Effect.flatMap(
                Effect.try({
                  try: () => JSON.stringify(value),
                  catch: (error) => new PersistenceBackingError({ method: "set", error })
                }),
                (u) =>
                  Effect.mapError(
                    store.set(key, u),
                    (error) => new PersistenceBackingError({ method: "set", error })
                  )
              ),
            remove: (key) =>
              Effect.mapError(
                store.remove(key),
                (error) => new PersistenceBackingError({ method: "remove", error })
              )
          })
        })
    })
  })
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerResultMemory: Layer.Layer<never, never, ResultPersistence> = layerResult.pipe(
  Layer.provide(layerMemory)
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerResultKeyValueStore: Layer.Layer<KeyValueStore.KeyValueStore, never, ResultPersistence> = layerResult
  .pipe(
    Layer.provide(layerKeyValueStore)
  )
