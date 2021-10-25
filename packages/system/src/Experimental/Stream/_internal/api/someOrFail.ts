// ets_tracing: off

import * as T from "../../../../Effect"
import * as O from "../../../../Option"
import type * as C from "../core"
import * as MapEffect from "./mapEffect"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail_<R, E, E1, A>(
  self: C.Stream<R, E, O.Option<A>>,
  e: E1
): C.Stream<R, E | E1, A> {
  return MapEffect.mapEffect_(
    self,
    O.fold(
      () => T.fail(e),
      (_) => T.succeed(_)
    )
  )
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @ets_data_first someOrFail_
 */
export function someOrFail<E1>(e: E1) {
  return <R, E, A>(self: C.Stream<R, E, O.Option<A>>) => someOrFail_(self, e)
}
