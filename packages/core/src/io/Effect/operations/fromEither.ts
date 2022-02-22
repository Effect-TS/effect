import type { Either } from "../../../data/Either"
import { fold } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static ets/EffectOps fromEitherNow
 */
export function fromEitherNow<E, A>(
  either: Either<E, A>,
  __etsTrace?: string
): Effect<unknown, E, A> {
  return Effect.fromEither(() => either)
}

/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static ets/EffectOps fromEither
 */
export function fromEither<E, A>(
  either: LazyArg<Either<E, A>>,
  __etsTrace?: string
): Effect<unknown, E, A> {
  return Effect.succeed(either).flatMap(fold(Effect.failNow, Effect.succeedNow))
}
