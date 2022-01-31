// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as Concat from "./concat.js"
import * as MapAccumEffect from "./mapAccumEffect.js"
import * as Succeed from "./succeed.js"

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results of type `S` given an initial S.
 */
export function scanEffect_<R, R1, E, E1, A, S>(
  self: C.Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
): C.Stream<R & R1, E | E1, S> {
  return Concat.concat_(
    Succeed.succeed(s),
    MapAccumEffect.mapAccumEffect_(self, s, (s, a) =>
      T.map_(f(s, a), (s) => Tp.tuple(s, s))
    )
  )
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results of type `S` given an initial S.
 *
 * @ets_data_first scanEffect_
 */
export function scanEffect<R1, E1, A, S>(s: S, f: (s: S, a: A) => T.Effect<R1, E1, S>) {
  return <R, E>(self: C.Stream<R, E, A>) => scanEffect_(self, s, f)
}
