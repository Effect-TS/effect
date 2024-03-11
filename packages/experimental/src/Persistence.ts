/**
 * @since 1.0.0
 */
import * as KeyValueStore from "@effect/platform/KeyValueStore"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Serializable from "@effect/schema/Serializable"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
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
}> {
  get message() {
    return TreeFormatter.formatIssue(this.error)
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export class PersistenceBackingError extends Data.TaggedError("PersistenceBackingError")<{
  readonly method: string
  readonly error: unknown
}> {
  get message() {
    const errorString = String(Predicate.hasProperty(this.error, "message") ? this.error.message : this.error)
    return `${this.method}: ${errorString}`
  }
}

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
  readonly make: (storeId: string) => Effect.Effect<BackingPersistenceStore, never, Scope.Scope>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface BackingPersistenceStore {
  readonly get: (key: string) => Effect.Effect<Option.Option<unknown>, PersistenceError>
  readonly getMany: (key: Array<string>) => Effect.Effect<Array<Option.Option<unknown>>, PersistenceError>
  readonly set: (key: string, value: unknown) => Effect.Effect<void, PersistenceError>
  readonly remove: (key: string) => Effect.Effect<void, PersistenceError>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const BackingPersistence: Context.Tag<BackingPersistence, BackingPersistence> = Context.GenericTag<
  BackingPersistence
>(
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
  readonly make: (storeId: string) => Effect.Effect<ResultPersistenceStore, never, Scope.Scope>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ResultPersistenceStore {
  readonly get: <R, IE, E, IA, A>(
    key: ResultPersistence.Key<R, IE, E, IA, A>
  ) => Effect.Effect<Option.Option<Exit.Exit<A, E>>, PersistenceError, R>
  readonly getMany: <R, IE, E, IA, A>(
    key: ReadonlyArray<ResultPersistence.Key<R, IE, E, IA, A>>
  ) => Effect.Effect<Array<Option.Option<Exit.Exit<A, E>>>, PersistenceError, R>
  readonly set: <R, IE, E, IA, A>(
    key: ResultPersistence.Key<R, IE, E, IA, A>,
    value: Exit.Exit<A, E>
  ) => Effect.Effect<void, PersistenceError, R>
  readonly remove: <R, IE, E, IA, A>(
    key: ResultPersistence.Key<R, IE, E, IA, A>
  ) => Effect.Effect<void, PersistenceError>
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
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type KeyAny = Key<any, any, any, any, any> | Key<any, never, never, any, any>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const ResultPersistence: Context.Tag<ResultPersistence, ResultPersistence> = Context.GenericTag<
  ResultPersistence
>(
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
            value: Exit.Exit<A, E>
          ) =>
            Effect.mapError(
              Serializable.serializeExit(key, value),
              (_) => new PersistenceSchemaError({ method, error: _.error })
            )
          const makeKey = <R, IE, E, IA, A>(
            key: ResultPersistence.Key<R, IE, E, IA, A>
          ) => key[PrimaryKey.symbol]()

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
export const layerMemory: Layer.Layer<BackingPersistence> = Layer.succeed(
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
export const layerKeyValueStore: Layer.Layer<BackingPersistence, never, KeyValueStore.KeyValueStore> = Layer.effect(
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
                  Effect.asSome(
                    Effect.try({
                      try: () => JSON.parse(s),
                      catch: (error) => new PersistenceBackingError({ method, error })
                    })
                  )
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
export const layerResultMemory: Layer.Layer<ResultPersistence> = layerResult.pipe(
  Layer.provide(layerMemory)
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerResultKeyValueStore: Layer.Layer<ResultPersistence, never, KeyValueStore.KeyValueStore> = layerResult
  .pipe(
    Layer.provide(layerKeyValueStore)
  )
