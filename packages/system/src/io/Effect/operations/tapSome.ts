import type { Option } from "packages/system/src/data/Option"

import { Effect } from "../definition"

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 * If the partial function isn't defined at the input, the result is
 * equivalent to the original effect.
 *
 * @tsplus fluent ets/Effect tapSome
 */
export function tapSome_<R, E, A, R1, E1, X>(
  self: Effect<R, E, A>,
  pf: (a: A) => Option<Effect<R1, E1, X>>,
  __etsTrace?: string
): Effect<R & R1, E | E1, A> {
  return self.tap((a) => pf(a).getOrElse(Effect.unit))
}

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 * If the partial function isn't defined at the input, the result is
 * equivalent to the original effect.
 *
 * @ets_data_first tapSome_
 */
export function tapSome<A, R1, E1, X>(
  pf: (a: A) => Option<Effect<R1, E1, X>>,
  __etsTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A> => self.tapSome(pf)
}
