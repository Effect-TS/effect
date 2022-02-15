import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../definition"

/**
 * A variant of `flatMap` that ignores the value produced by this effect.
 *
 * @tsplus fluent ets/Effect zipRight
 * @tsplus operator ets/Effect >
 */
export function zipRight_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A2> {
  return self.flatMap(() => that())
}

/**
 * A variant of `flatMap` that ignores the value produced by this effect.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<R2, E2, A2>(
  that: LazyArg<Effect<R2, E2, A2>>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A2> =>
    self.zipRight(that)
}
