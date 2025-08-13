/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Lmdb from "lmdb"
import * as Persistence from "../Persistence.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: Lmdb.RootDatabaseOptionsWithPath) =>
  Effect.gen(function*() {
    const lmdb = yield* Effect.acquireRelease(
      Effect.sync(() => Lmdb.open(options)),
      (lmdb) => Effect.promise(() => lmdb.close())
    )

    return Persistence.BackingPersistence.of({
      [Persistence.BackingPersistenceTypeId]: Persistence.BackingPersistenceTypeId,
      make: (storeId) =>
        Effect.gen(function*() {
          const clock = yield* Effect.clock
          const store = yield* Effect.acquireRelease(
            Effect.sync(() => lmdb.openDB({ name: storeId })),
            (store) => Effect.promise(() => store.close())
          )
          const valueToOption = (key: string, _: any) => {
            if (!Arr.isArray(_)) return Option.none()
            const [value, expires] = _ as [unknown, number | null]
            if (expires !== null && expires <= clock.unsafeCurrentTimeMillis()) {
              store.remove(key)
              return Option.none()
            }
            return Option.some(value)
          }
          return identity<Persistence.BackingPersistenceStore>({
            get: (key) =>
              Effect.try({
                try: () => valueToOption(key, store.get(key)),
                catch: (error) => Persistence.PersistenceBackingError.make("get", error)
              }),
            getMany: (keys) =>
              Effect.map(
                Effect.tryPromise({
                  try: () => store.getMany(keys),
                  catch: (error) => Persistence.PersistenceBackingError.make("getMany", error)
                }),
                Arr.map((value, i) => valueToOption(keys[i], value))
              ),
            set: (key, value, ttl) =>
              Effect.tryPromise({
                try: () => store.put(key, [value, Persistence.unsafeTtlToExpires(clock, ttl)]),
                catch: (error) => Persistence.PersistenceBackingError.make("set", error)
              }),
            setMany: (entries) =>
              Effect.tryPromise({
                try: () =>
                  Promise.all(entries.map(([key, value, ttl]) =>
                    store.put(key, [value, Persistence.unsafeTtlToExpires(clock, ttl)])
                  )),
                catch: (error) =>
                  Persistence.PersistenceBackingError.make("setMany", error)
              }),
            remove: (key) =>
              Effect.tryPromise({
                try: () => store.remove(key),
                catch: (error) => Persistence.PersistenceBackingError.make("remove", error)
              }),
            clear: Effect.tryPromise({
              try: () => store.clearAsync(),
              catch: (error) => Persistence.PersistenceBackingError.make("clear", error)
            })
          })
        })
    })
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (
  options: Lmdb.RootDatabaseOptionsWithPath
): Layer.Layer<Persistence.BackingPersistence> =>
  Layer.scoped(
    Persistence.BackingPersistence,
    make(options)
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerResult = (
  options: Lmdb.RootDatabaseOptionsWithPath
): Layer.Layer<Persistence.ResultPersistence> =>
  Persistence.layerResult.pipe(
    Layer.provide(layer(options))
  )
