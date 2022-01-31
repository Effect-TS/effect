import type { Either } from "../../../data/Either"
import { fold } from "../../../data/Either"
import type { Cause } from "../../Cause"
import type { IO } from "../definition"
import { Effect } from "../definition"

// TODO(Mike/Max): make lazy

/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static ets/EffectOps fromEitherCause
 */
export function fromEitherCause<E, A>(
  either: Either<Cause<E>, A>,
  __etsTrace?: string
): IO<E, A> {
  return Effect.succeed(() => either).flatMap(
    fold(Effect.failCauseNow, Effect.succeedNow)
  )
}
