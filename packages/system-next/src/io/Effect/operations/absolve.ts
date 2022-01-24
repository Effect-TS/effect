import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Submerges the error case of an `Either` into the `Effect`. The inverse
 * operation of `either`.
 *
 * @ets fluent ets/Effect absolve
 */
export function absolveNow<R, E, A>(
  self: Effect<R, E, Either<E, A>>,
  __etsTrace?: string
): Effect<R, E, A> {
  return Effect.absolve(self)
}

/**
 * Submerges the error case of an `Either` into the `Effect`. The inverse
 * operation of `either`.
 *
 * @ets static ets/EffectOps absolve
 */
export function absolve<R, E, A>(
  self: LazyArg<Effect<R, E, Either<E, A>>>,
  __etsTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(self).flatMap(Effect.fromEitherNow)
}
