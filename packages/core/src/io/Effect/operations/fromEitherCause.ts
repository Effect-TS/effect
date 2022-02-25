import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { Cause } from "../../Cause"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static ets/EffectOps fromEitherCauseNow
 */
export function fromEitherCauseNow<E, A>(
  either: Either<Cause<E>, A>,
  __tsplusTrace?: string
): IO<E, A> {
  return Effect.succeed(() => either).flatMap((either) =>
    either.fold(Effect.failCauseNow, Effect.succeedNow)
  )
}

/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static ets/EffectOps fromEitherCause
 */
export function fromEitherCause<E, A>(
  either: LazyArg<Either<Cause<E>, A>>,
  __tsplusTrace?: string
): IO<E, A> {
  return Effect.succeed(either).flatMap((either) =>
    either.fold(Effect.failCauseNow, Effect.succeedNow)
  )
}
