// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as MapAccumEffect from "./mapAccumEffect.js"

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results.
 *
 * See also `Stream#scanEffect`.
 */
export function scanReduceEffect_<R, R1, E, E1, A, A1 extends A>(
  self: C.Stream<R, E, A>,
  f: (a1: A1, a: A) => T.Effect<R1, E1, A1>
): C.Stream<R & R1, E | E1, A1> {
  return MapAccumEffect.mapAccumEffect_(self, O.emptyOf<A1>(), (s, a) =>
    O.fold_(
      s,
      () => T.succeed(Tp.tuple(O.some(a as A1), a as A1)),
      (a1) => T.map_(f(a1, a), (a2) => Tp.tuple(O.some(a2), a2))
    )
  )
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results.
 *
 * See also `Stream#scanEffect`.
 *
 * @ets_data_first scanReduceEffect_
 */
export function scanReduceEffect<R1, E1, A, A1 extends A>(
  f: (a1: A1, a: A) => T.Effect<R1, E1, A1>
) {
  return <R, E>(self: C.Stream<R, E, A>) => scanReduceEffect_(self, f)
}
