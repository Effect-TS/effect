import * as Cause from "effect/Cause"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"

/**
 * Cooperative cancellation still joins the child. Retain cleanup failures that
 * Effect's timeout race can otherwise replace with only the deadline result.
 *
 * @internal
 */
export const timeoutOrElseWithCause = <E2, R2>(options: {
  readonly duration: Duration.Input
  readonly orElse: () => Effect.Effect<never, E2, R2>
}) =>
<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E | E2, R | R2> =>
  Effect.uninterruptibleMask((restore) =>
    Effect.gen(function*() {
      let original: Cause.Cause<E> | undefined
      let timedOut = false

      const exit = yield* Effect.exit(
        restore(
          effect.pipe(
            Effect.onExit((exit) =>
              Effect.sync(() => {
                if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
                  original = exit.cause
                }
              })
            ),
            Effect.timeoutOrElse({
              duration: options.duration,
              orElse: () =>
                Effect.suspend(() => {
                  timedOut = true

                  return options.orElse()
                })
            })
          )
        )
      )

      if (Exit.isSuccess(exit)) return exit.value
      // Normal failures already include every reason. Effect.fn can reannotate
      // them, so reference inequality alone is not evidence of a missing reason.
      if (!timedOut && !Cause.hasInterruptsOnly(exit.cause)) return yield* exit

      const missing = original?.reasons.filter((reason) => !exit.cause.reasons.includes(reason)) ?? []

      return yield* Effect.failCause(
        missing.length === 0
          ? exit.cause
          : Cause.fromReasons<E | E2>([...exit.cause.reasons, ...missing])
      )
    })
  )

/** @internal */
export const timeoutWithCause = (duration: Duration.Input) =>
  timeoutOrElseWithCause({ duration, orElse: () => Effect.fail(new Cause.TimeoutError()) })
