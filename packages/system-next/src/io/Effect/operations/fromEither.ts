import type { Either } from "../../../data/Either"
import { fold } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @ets static ets/EffectOps fromEitherNow
 */
export function fromEitherNow<E, A>(
  self: Either<E, A>,
  __trace?: string
): Effect<unknown, E, A> {
  return Effect.fromEither(() => self)
}

/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @ets static ets/EffectOps fromEither
 */
export function fromEither<E, A>(
  f: LazyArg<Either<E, A>>,
  __trace?: string
): Effect<unknown, E, A> {
  return Effect.succeed(f).flatMap(fold(Effect.failNow, Effect.succeedNow))
}
