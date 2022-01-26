import * as O from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @ets static ets/EffectOps continueOrFail
 */
export function continueOrFail_<R, E, E1, A, A2>(
  self: Effect<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<A2>,
  __etsTrace?: string
): Effect<R, E | E1, A2> {
  return self.continueOrFailEffect(e, (a) => O.map_(pf(a), Effect.succeedNow))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @ets_data_first continueOrFail_
 */
export function continueOrFail<E1, A, A2>(
  e: () => E1,
  pf: (a: A) => O.Option<A2>,
  __etsTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E | E1, A2> =>
    continueOrFail_(self, e, pf)
}
