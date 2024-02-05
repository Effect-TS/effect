/**
 * @since 1.0.0
 */
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
  Effect.gen(function*(_) {
    const lmdb = yield* _(Effect.acquireRelease(
      Effect.sync(() => Lmdb.open(options)),
      (lmdb) => Effect.promise(() => lmdb.close())
    ))

    return Persistence.BackingPersistence.of({
      [Persistence.BackingPersistenceTypeId]: Persistence.BackingPersistenceTypeId,
      make: (storeId) =>
        Effect.gen(function*(_) {
          const store = yield* _(Effect.acquireRelease(
            Effect.sync(() => lmdb.openDB({ name: storeId })),
            (store) => Effect.promise(() => store.close())
          ))
          return identity<Persistence.BackingPersistenceStore>({
            get: (key) =>
              Effect.try({
                try: () => Option.fromNullable(store.get(key)),
                catch: (error) => new Persistence.PersistenceBackingError({ method: "get", error })
              }),
            getMany: (keys) =>
              Effect.tryPromise({
                try: () => store.getMany(keys).then((_) => _.map(Option.fromNullable)),
                catch: (error) => new Persistence.PersistenceBackingError({ method: "getMany", error })
              }),
            set: (key, value) =>
              Effect.tryPromise({
                try: () => store.put(key, value),
                catch: (error) => new Persistence.PersistenceBackingError({ method: "set", error })
              }),
            remove: (key) =>
              Effect.tryPromise({
                try: () => store.remove(key),
                catch: (error) => new Persistence.PersistenceBackingError({ method: "remove", error })
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
