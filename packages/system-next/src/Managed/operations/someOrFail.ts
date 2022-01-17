import * as O from "../../Option"
import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { fail } from "./fail"
import { succeedNow } from "./succeedNow"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail_<R, E, A, E1>(
  self: Managed<R, E, O.Option<A>>,
  e: () => E1,
  __trace?: string
) {
  return chain_(
    self,
    O.fold(() => fail(e), succeedNow),
    __trace
  )
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @ets_data_first someOrFail_
 */
export function someOrFail<E1>(e: () => E1, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, O.Option<A>>): Managed<R, E1 | E, A> =>
    someOrFail_(self, e, __trace)
}
