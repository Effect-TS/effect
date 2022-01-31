// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as Chain from "./chain.js"
import * as Empty from "./empty.js"
import * as FromEffect from "./fromEffect.js"

/**
 * Returns the resulting stream when the given `PartialFunction` is defined for the given effectful value, otherwise returns an empty stream.
 */
export function whenCaseEffect_<R, R1, E, E1, A, A1>(
  a: T.Effect<R, E, A>,
  pf: (a: A) => O.Option<C.Stream<R1, E1, A1>>
): C.Stream<R & R1, E | E1, A1> {
  return Chain.chain_(FromEffect.fromEffect(a), (_) =>
    O.fold_(
      pf(_),
      () => Empty.empty,
      (s) => s
    )
  )
}

/**
 * Returns the resulting stream when the given `PartialFunction` is defined for the given effectful value, otherwise returns an empty stream.
 *
 * @ets_data_first whenCaseEffect_
 */
export function whenCaseEffect<R1, E1, A, A1>(
  pf: (a: A) => O.Option<C.Stream<R1, E1, A1>>
) {
  return <R, E>(a: T.Effect<R, E, A>) => whenCaseEffect_(a, pf)
}
