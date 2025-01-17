/**
 * @since 1.0.0
 */
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type { RedisOptions } from "ioredis"
import { Redis } from "ioredis"
import * as Persistence from "../Persistence.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: RedisOptions) =>
  Effect.gen(function*() {
    const redis = yield* Effect.acquireRelease(
      Effect.sync(() => new Redis(options)),
      (redis) => Effect.promise(() => redis.quit())
    )
    return Persistence.BackingPersistence.of({
      [Persistence.BackingPersistenceTypeId]: Persistence.BackingPersistenceTypeId,
      make: (prefix) =>
        Effect.sync(() => {
          const prefixed = (key: string) => `${prefix}:${key}`
          const parse = (method: string) => (str: string | null) => {
            if (str === null) {
              return Effect.succeedNone
            }
            return Effect.try({
              try: () => Option.some(JSON.parse(str)),
              catch: (error) => Persistence.PersistenceBackingError.make(method, error)
            })
          }
          return identity<Persistence.BackingPersistenceStore>({
            get: (key) =>
              Effect.flatMap(
                Effect.tryPromise({
                  try: () => redis.get(prefixed(key)),
                  catch: (error) => Persistence.PersistenceBackingError.make("get", error)
                }),
                parse("get")
              ),
            getMany: (keys) =>
              Effect.flatMap(
                Effect.tryPromise({
                  try: () => redis.mget(keys.map(prefixed)),
                  catch: (error) => Persistence.PersistenceBackingError.make("getMany", error)
                }),
                Effect.forEach(parse("getMany"))
              ),
            set: (key, value, ttl) =>
              Effect.tryMapPromise(
                Effect.try({
                  try: () => JSON.stringify(value),
                  catch: (error) => Persistence.PersistenceBackingError.make("set", error)
                }),
                {
                  try: (value) =>
                    ttl._tag === "None"
                      ? redis.set(prefixed(key), value)
                      : redis.set(prefixed(key), value, "PX", Duration.toMillis(ttl.value)),
                  catch: (error) => Persistence.PersistenceBackingError.make("set", error)
                }
              ),
            remove: (key) =>
              Effect.tryPromise({
                try: () => redis.del(prefixed(key)),
                catch: (error) => Persistence.PersistenceBackingError.make("remove", error)
              }),
            clear: Effect.tryPromise({
              try: () => redis.keys(`${prefix}:*`).then((keys) => redis.del(keys)),
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
  options: RedisOptions
): Layer.Layer<Persistence.BackingPersistence> =>
  Layer.scoped(
    Persistence.BackingPersistence,
    make(options)
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerConfig = (
  options: Config.Config.Wrap<RedisOptions>
): Layer.Layer<Persistence.BackingPersistence, ConfigError> =>
  Layer.scoped(
    Persistence.BackingPersistence,
    Effect.flatMap(Config.unwrap(options), make)
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerResult = (
  options: RedisOptions
): Layer.Layer<Persistence.ResultPersistence> =>
  Persistence.layerResult.pipe(
    Layer.provide(layer(options))
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerResultConfig = (
  options: Config.Config.Wrap<RedisOptions>
): Layer.Layer<Persistence.ResultPersistence, ConfigError> =>
  Persistence.layerResult.pipe(
    Layer.provide(layerConfig(options))
  )
