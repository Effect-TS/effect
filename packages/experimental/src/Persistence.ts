/**
 * @since 1.0.0
 */
import { RefailError, TypeIdError } from "@effect/platform/Error"
import * as KeyValueStore from "@effect/platform/KeyValueStore"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Serializable from "@effect/schema/Serializable"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PrimaryKey from "effect/PrimaryKey"
import type * as Scope from "effect/Scope"
import * as TimeToLive from "./TimeToLive.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId = Symbol.for("@effect/experimental/PersistenceError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export type PersistenceError = PersistenceParseError | PersistenceBackingError

/**
 * @since 1.0.0
 * @category errors
 */
export class PersistenceParseError extends TypeIdError(ErrorTypeId, "PersistenceError")<{
  readonly reason: "ParseError"
  readonly method: string
  readonly error: ParseResult.ParseError["error"]
}> {
  /**
   * @since 1.0.0
   */
  static make(method: string, error: ParseResult.ParseError["error"]) {
    return new PersistenceParseError({ reason: "ParseError", method, error })
  }

  get message() {
    return TreeFormatter.formatIssueSync(this.error)
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export class PersistenceBackingError extends RefailError(ErrorTypeId, "PersistenceError")<{
  readonly reason: "BackingError"
  readonly method: string
}> {
  /**
   * @since 1.0.0
   */
  static make(method: string, error: unknown) {
    return new PersistenceBackingError({ reason: "BackingError", method, error })
  }

  get message() {
    return `${this.method}: ${super.message}`
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
  readonly set: (
    key: string,
    value: unknown,
    ttl: Option.Option<Duration.Duration>
  ) => Effect.Effect<void, PersistenceError>
  readonly remove: (key: string) => Effect.Effect<void, PersistenceError>
  readonly clear: Effect.Effect<void, PersistenceError>
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
  readonly clear: Effect.Effect<void, PersistenceError>
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
  export interface Key<R, IE, E, IA, A> extends PrimaryKey.PrimaryKey, Serializable.WithResult<A, IA, E, IE, R> {
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
              (_) => PersistenceParseError.make(method, _.error)
            )
          const encode = <R, IE, E, IA, A>(
            method: string,
            key: ResultPersistence.Key<R, IE, E, IA, A>,
            value: Exit.Exit<A, E>
          ) =>
            Effect.mapError(
              Serializable.serializeExit(key, value),
              (_) => PersistenceParseError.make(method, _.error)
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
            set: (key, value) => {
              const ttl = TimeToLive.getFinite(key, value)
              if (Option.isSome(ttl) && Duration.equals(ttl.value, Duration.zero)) {
                return Effect.unit
              }
              return encode("set", key, value).pipe(
                Effect.flatMap((encoded) => storage.set(makeKey(key), encoded, ttl))
              )
            },
            remove: (key) => storage.remove(makeKey(key)),
            clear: storage.clear
          })
        })
    })
  })
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerMemory: Layer.Layer<BackingPersistence> = Layer.sync(
  BackingPersistence,
  () => {
    const stores = new Map<string, Map<string, readonly [unknown, expires: number | null]>>()
    const getStore = (storeId: string) => {
      let store = stores.get(storeId)
      if (store === undefined) {
        store = new Map<string, readonly [unknown, expires: number | null]>()
        stores.set(storeId, store)
      }
      return store
    }
    return BackingPersistence.of({
      [BackingPersistenceTypeId]: BackingPersistenceTypeId,
      make: (storeId) =>
        Effect.map(Effect.clock, (clock) => {
          const map = getStore(storeId)
          const unsafeGet = (key: string): Option.Option<unknown> => {
            const value = map.get(key)
            if (value === undefined) {
              return Option.none()
            } else if (value[1] !== null && value[1] <= clock.unsafeCurrentTimeMillis()) {
              map.delete(key)
              return Option.none()
            }
            return Option.some(value[0])
          }
          return identity<BackingPersistenceStore>({
            get: (key) => Effect.sync(() => unsafeGet(key)),
            getMany: (keys) => Effect.sync(() => keys.map(unsafeGet)),
            set: (key, value, ttl) => Effect.sync(() => map.set(key, [value, TimeToLive.unsafeToExpires(clock, ttl)])),
            remove: (key) => Effect.sync(() => map.delete(key)),
            clear: Effect.sync(() => map.clear())
          })
        })
    })
  }
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
        Effect.map(Effect.clock, (clock) => {
          const store = KeyValueStore.prefix(backing, storeId)
          const get = (method: string, key: string) =>
            Effect.flatMap(
              Effect.mapError(
                store.get(key),
                (error) => PersistenceBackingError.make(method, error)
              ),
              Option.match({
                onNone: () => Effect.succeedNone,
                onSome: (s) =>
                  Effect.flatMap(
                    Effect.try({
                      try: () => JSON.parse(s),
                      catch: (error) => PersistenceBackingError.make(method, error)
                    }),
                    (_) => {
                      if (!Array.isArray(_)) return Effect.succeedNone
                      const [value, expires] = _ as [unknown, number | null]
                      if (expires !== null && expires <= clock.unsafeCurrentTimeMillis()) {
                        return Effect.as(Effect.ignore(store.remove(key)), Option.none())
                      }
                      return Effect.succeed(Option.some(value))
                    }
                  )
              })
            )
          return identity<BackingPersistenceStore>({
            get: (key) => get("get", key),
            getMany: (keys) => Effect.forEach(keys, (key) => get("getMany", key)),
            set: (key, value, ttl) =>
              Effect.flatMap(
                Effect.try({
                  try: () => JSON.stringify([value, TimeToLive.unsafeToExpires(clock, ttl)]),
                  catch: (error) => PersistenceBackingError.make("set", error)
                }),
                (u) =>
                  Effect.mapError(
                    store.set(key, u),
                    (error) => PersistenceBackingError.make("set", error)
                  )
              ),
            remove: (key) =>
              Effect.mapError(
                store.remove(key),
                (error) => PersistenceBackingError.make("remove", error)
              ),
            clear: Effect.mapError(store.clear, (error) => PersistenceBackingError.make("clear", error))
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
