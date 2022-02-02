import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @tsplus fluent ets/Effect continueOrFail
 */
export function continueOrFail_<R, E, E1, A, A2>(
  self: Effect<R, E, A>,
  e: LazyArg<E1>,
  pf: (a: A) => Option<A2>,
  __etsTrace?: string
): Effect<R, E | E1, A2> {
  return self.continueOrFailEffect(e, (a) => pf(a).map(Effect.succeedNow))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @ets_data_first continueOrFail_
 */
export function continueOrFail<E1, A, A2>(
  e: LazyArg<E1>,
  pf: (a: A) => Option<A2>,
  __etsTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E | E1, A2> =>
    self.continueOrFail(e, pf)
}
