import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"

import { Unavailable } from "../oauth/OAuthError.ts"

/**
 * Each operation belongs to the factory's Scope and is joined by its caller.
 * @internal
 */
export const make = Effect.gen(function*() {
  const scope = yield* Effect.scope

  const available = Effect.suspend(() =>
    scope.state._tag === "Closed" ? Effect.fail(Unavailable.make({})) : Effect.void
  )

  // Closure cannot publish success or a definite rejection. Keep failures from
  // joined work observable even when closure or caller interruption wins.
  const use = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.suspend(() => {
      let delivered = false

      return Effect.acquireUseRelease(
        available.pipe(Effect.andThen(Effect.forkIn(effect, scope, { uninterruptible: false }))),
        (fiber) =>
          Effect.uninterruptibleMask((restore) =>
            Effect.gen(function*() {
              const exit = yield* restore(Fiber.await(fiber))

              delivered = true
              if (scope.state._tag === "Closed") {
                if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
                  return yield* Effect.failCause(Cause.map(exit.cause, () => Unavailable.make({})))
                }

                return yield* Unavailable.make({})
              }

              return yield* exit
            })
          ),
        (fiber) =>
          Effect.gen(function*() {
            yield* Fiber.interrupt(fiber)
            const exit = yield* Fiber.await(fiber)

            if (!delivered && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
              return yield* Effect.failCause(exit.cause)
            }
          })
      )
    })

  return { available, use }
})
