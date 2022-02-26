import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * partial function, returning a `XRefM` with a `get` value that succeeds
 * with the result of the partial function if it is defined or else fails
 * with `None`.
 *
 * @tsplus fluent ets/XSynchronized collect
 */
export function collect_<RA, RB, EA, EB, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  pf: (b: B) => Option<C>
): XSynchronized<RA, RB, EA, Option<EB>, A, C> {
  return self.collectEffect((b) => pf(b).map(Effect.succeedNow))
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * partial function, returning a `XRefM` with a `get` value that succeeds
 * with the result of the partial function if it is defined or else fails
 * with `None`.
 *
 * @ets_data_first collect_
 */
export function collect<B, C>(pf: (b: B) => Option<C>) {
  return <RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, EA, Option<EB>, A, C> => self.collect(pf)
}
