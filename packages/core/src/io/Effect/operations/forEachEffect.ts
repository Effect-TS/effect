import { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Returns a new effect that will pass the success value of this effect to the
 * provided callback. If this effect fails, then the failure will be ignored.
 *
 * @tsplus fluent ets/Effect forEachEffect
 */
export function forEachEffect_<R, E, A, R1, E1, B>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, E1, B>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, Option<B>> {
  return self.foldCauseEffect(
    () => Effect.none,
    (a) => f(a).map(Option.some)
  )
}

/**
 * Returns a new effect that will pass the success value of this effect to the
 * provided callback. If this effect fails, then the failure will be ignored.
 *
 * @ets_data_first forEachEffect_
 */
export function forEachEffect<A, R1, E1, B>(
  f: (a: A) => Effect<R1, E1, B>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, Option<B>> =>
    self.forEachEffect(f)
}
