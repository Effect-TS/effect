/**
 * A variant of `flatMap` that ignores the value produced by this effect.
 *
 * @tsplus fluent ets/Effect zipRight
 * @tsplus operator ets/Effect >
 */
export function zipRight_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A2> {
  return self.flatMap(that);
}

/**
 * A variant of `flatMap` that ignores the value produced by this effect.
 *
 * @tsplus static ets/Effect/Aspects zipRight
 */
export const zipRight = Pipeable(zipRight_);
