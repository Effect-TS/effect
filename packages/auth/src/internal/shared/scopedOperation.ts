import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"

/**
 * Capture the factory Scope once and join each operation before returning to its caller.
 * Caller cancellation must inspect the joined Exit as well as interrupt it.
 *
 * @internal
 */
export const makeScopedOperation = Effect.fnUntraced(function*<Closed>(unavailable: () => Closed) {
  const scope = yield* Effect.scope

  return <A, E, R>(work: Effect.Effect<A, E, R>): Effect.Effect<A, E | Closed, R> =>
    Effect.suspend(() => {
      let delivered = false

      return Effect.acquireUseRelease(
        Effect.suspend(() =>
          scope.state._tag === "Closed"
            ? Effect.fail(unavailable())
            : Effect.forkIn(work, scope, { uninterruptible: false })
        ),
        (fiber) =>
          Effect.uninterruptibleMask((restore) =>
            Effect.gen(function*() {
              const exit = yield* restore(Fiber.await(fiber))

              delivered = true
              // Owner closure is an unavailable service, but cannot hide a
              // concurrent failure or cleanup defect from the joined operation.
              if (
                scope.state._tag === "Closed" &&
                (Exit.isSuccess(exit) || Cause.hasInterruptsOnly(exit.cause))
              ) {
                return yield* Effect.fail(unavailable())
              }
              if (Exit.isFailure(exit)) return yield* exit

              return exit.value
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
})
