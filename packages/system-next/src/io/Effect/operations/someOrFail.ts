import type { LazyArg } from "../../../data/Function"
import * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { failNow } from "./failNow"
import { succeed } from "./succeed"
import { succeedNow } from "./succeedNow"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @ets fluent ets/Effect someOrFail
 */
export function someOrFail_<R, E, A, E2>(
  self: Effect<R, E, O.Option<A>>,
  orFail: LazyArg<E2>,
  __trace?: string
): Effect<R, E | E2, A> {
  return chain_(
    self,
    O.fold(() => chain_(succeed(orFail), failNow), succeedNow),
    __trace
  )
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @ets_data_first someOrFail_
 */
export function someOrFail<E2>(orFail: () => E2, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, O.Option<A>>) => someOrFail_(self, orFail)
}
