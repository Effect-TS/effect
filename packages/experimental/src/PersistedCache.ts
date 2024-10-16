/**
 * @since 1.0.0
 */
import * as Cache from "effect/Cache"
import * as Data from "effect/Data"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import { identity, pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Option from "effect/Option"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Tracer from "effect/Tracer"
import * as Persistence from "./Persistence.js"

class CacheRequest<K extends Persistence.ResultPersistence.KeyAny> extends Data.Class<{
  readonly key: K
  readonly span: Option.Option<Tracer.AnySpan>
}> {
  [Equal.symbol](that: CacheRequest<K>): boolean {
    return Equal.equals(this.key, that.key)
  }
  [Hash.symbol]() {
    return Hash.hash(this.key)
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface PersistedCache<K extends Persistence.ResultPersistence.KeyAny> {
  readonly get: (
    key: K
  ) => Effect.Effect<
    Schema.WithResult.Success<K>,
    Schema.WithResult.Failure<K> | Persistence.PersistenceError
  >
  readonly invalidate: (key: K) => Effect.Effect<void, Persistence.PersistenceError>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <K extends Persistence.ResultPersistence.KeyAny, R>(options: {
  readonly storeId: string
  readonly lookup: (key: K) => Effect.Effect<Schema.WithResult.Success<K>, Schema.WithResult.Failure<K>, R>
  readonly timeToLive: (...args: Persistence.ResultPersistence.TimeToLiveArgs<K>) => Duration.DurationInput
  readonly inMemoryCapacity?: number | undefined
  readonly inMemoryTTL?: Duration.DurationInput | undefined
}): Effect.Effect<
  PersistedCache<K>,
  never,
  Schema.SerializableWithResult.Context<K> | R | Persistence.ResultPersistence | Scope.Scope
> =>
  Persistence.ResultPersistence.pipe(
    Effect.flatMap((_) =>
      _.make({
        storeId: options.storeId,
        timeToLive: options.timeToLive as any
      })
    ),
    Effect.bindTo("store"),
    Effect.bind("inMemoryCache", ({ store }) =>
      Cache.make({
        lookup: (request: CacheRequest<K>) => {
          const effect: Effect.Effect<
            Schema.WithResult.Success<K>,
            Schema.WithResult.Failure<K> | Persistence.PersistenceError,
            Schema.SerializableWithResult.Context<K> | R
          > = pipe(
            store.get(request.key as any),
            Effect.flatMap(Option.match({
              onNone: () =>
                options.lookup(request.key).pipe(
                  Effect.exit,
                  Effect.tap((exit) => store.set(request.key as any, exit)),
                  Effect.flatten
                ),
              onSome: identity
            }))
          ) as any
          return request.span._tag === "Some" ? Effect.withParentSpan(effect, request.span.value) : effect
        },
        capacity: options.inMemoryCapacity ?? 64,
        timeToLive: options.inMemoryTTL ?? 10_000
      })),
    Effect.map(({ inMemoryCache, store }) =>
      identity<PersistedCache<K>>({
        get: (key) =>
          Effect.serviceOption(Tracer.ParentSpan).pipe(
            Effect.flatMap((span) => inMemoryCache.get(new CacheRequest({ key, span })))
          ),
        invalidate: (key) =>
          store.remove(key as any).pipe(
            Effect.zipRight(inMemoryCache.invalidate(new CacheRequest({ key, span: Option.none() })))
          )
      })
    )
  )
