import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"

import { Unavailable } from "../OAuthError.ts"

/** Each operation belongs to the factory's Scope and is joined by its caller. */
export const make = Effect.gen(function*() {
  const scope = yield* Effect.scope

  const available = Effect.suspend(() =>
    scope.state._tag === "Closed" ? Effect.fail(Unavailable.make({})) : Effect.void
  )

  // Inspect the exit only after checking the owner: closure must stay unavailable,
  // even when an interrupted operation was about to return a definite rejection.
  const use = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.acquireUseRelease(
      available.pipe(Effect.andThen(Effect.forkIn(effect, scope, { uninterruptible: false }))),
      (fiber) =>
        Effect.gen(function*() {
          const exit = yield* Fiber.await(fiber)

          yield* available

          return yield* exit
        }),
      Fiber.interrupt
    )

  return { available, use }
})
