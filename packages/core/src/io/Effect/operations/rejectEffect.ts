import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @tsplus fluent ets/Effect rejectEffect
 */
export function rejectEffect_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  pf: (a: A) => Option<Effect<R1, E1, E1>>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, A> {
  return self.flatMap((a) =>
    pf(a).fold(
      () => Effect.succeedNow(a),
      (effect) => effect.flatMap(Effect.failNow)
    )
  )
}

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @ets_data_first rejectEffect_
 */
export function rejectEffect<A, R1, E1>(
  pf: (a: A) => Option<Effect<R1, E1, E1>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A> =>
    self.rejectEffect(pf)
}
