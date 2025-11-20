/**
 * @since 1.0.0
 */
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as RcRef from "effect/RcRef"
import * as Scope from "effect/Scope"
import * as Entity from "./Entity.js"
import type { Sharding } from "./Sharding.js"

/**
 * @since 1.0.0
 * @category Type ids
 */
export const TypeId: TypeId = "~@effect/cluster/EntityResource"

/**
 * @since 1.0.0
 * @category Type ids
 */
export type TypeId = "~@effect/cluster/EntityResource"

/**
 * @since 1.0.0
 * @category Models
 */
export interface EntityResource<out A, out E = never> {
  readonly [TypeId]: TypeId
  readonly get: Effect.Effect<A, E, Scope.Scope>
  readonly close: Effect.Effect<void>
}

/**
 * A `EntityResource` is a resource that can be acquired inside a cluster
 * entity, which will keep the entity alive even across restarts.
 *
 * The resource will only be fully released when the idle time to live is
 * reached, or when the `close` effect is called.
 *
 * By default, the `idleTimeToLive` is infinite, meaning the resource will only
 * be released when `close` is called.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make: <A, E, R>(options: {
  readonly acquire: Effect.Effect<A, E, R>
  readonly idleTimeToLive?: Duration.DurationInput | undefined
  /**
   * When to close the resource Scope.
   *
   * If set to "explicit", the resource will only be cleaned up when either the
   * `idleTimeToLive` is reached, or the .close effect is called.
   *
   * Defaults to "always", which means the resource will be cleaned up when the
   * the parent Scope is closed.
   */
  readonly shutdownMode?: "explicit" | "always" | undefined
}) => Effect.Effect<
  EntityResource<A, E>,
  E,
  Scope.Scope | R | Sharding | Entity.CurrentAddress
> = Effect.fnUntraced(function*<A, E, R>(options: {
  readonly acquire: Effect.Effect<A, E, R>
  readonly idleTimeToLive?: Duration.DurationInput | undefined
  readonly shutdownMode?: "explicit" | "always" | undefined
}) {
  const shutdownMode = options.shutdownMode ?? "always"
  let shuttingDown = false

  const ref = yield* RcRef.make({
    acquire: Effect.gen(function*() {
      let scope = yield* Effect.scope

      if (shutdownMode === "explicit") {
        const closeable = yield* Scope.make()
        const context = yield* Effect.context<Sharding | Entity.CurrentAddress>()
        yield* Scope.addFinalizerExit(
          scope,
          Effect.fnUntraced(function*(exit) {
            if (shuttingDown) return
            yield* Scope.close(closeable, exit)
            yield* Entity.keepAlive(false)
          }, Effect.provide(context))
        )
        scope = closeable
      } else {
        yield* Effect.addFinalizer(() => {
          if (shuttingDown) return Effect.void
          return Entity.keepAlive(false)
        })
      }

      yield* Entity.keepAlive(true)

      return yield* options.acquire.pipe(
        Scope.extend(scope)
      )
    }),
    idleTimeToLive: options.idleTimeToLive ?? Duration.infinity
  })

  yield* Effect.addFinalizer(() => {
    shuttingDown = true
    return Effect.void
  })

  // Initialize the resource
  yield* Effect.scoped(RcRef.get(ref))

  return identity<EntityResource<A, E>>({
    [TypeId]: TypeId,
    get: RcRef.get(ref),
    close: RcRef.invalidate(ref)
  })
})
