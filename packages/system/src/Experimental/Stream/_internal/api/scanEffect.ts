// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as T from "../../../../Effect"
import type * as C from "../core"
import * as Concat from "./concat"
import * as MapAccumEffect from "./mapAccumEffect"
import * as Succeed from "./succeed"

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
