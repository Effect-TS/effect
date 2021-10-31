// ets_tracing: off

import * as T from "../../../../Effect"
import type * as O from "../../../../Option"
import type * as C from "../core"
import * as WhenCaseEffect from "./whenCaseEffect"

/**
 * Returns the resulting stream when the given `PartialFunction` is defined for the given value, otherwise returns an empty stream.
 */
export function whenCase_<R, E, A, A1>(
  a: () => A,
  pf: (a: A) => O.Option<C.Stream<R, E, A1>>
): C.Stream<R, E, A1> {
  return WhenCaseEffect.whenCaseEffect_(T.succeed(a()), pf)
}

/**
 * Returns the resulting stream when the given `PartialFunction` is defined for the given value, otherwise returns an empty stream.
 *
 * @ets_data_first whenCase_
 */
export function whenCase<R, E, A, A1>(pf: (a: A) => O.Option<C.Stream<R, E, A1>>) {
  return (a: () => A) => whenCase_(a, pf)
}
