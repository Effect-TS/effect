// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as T from "../_internal/effect.js"
import { concat_ } from "./concat.js"
import type { Stream } from "./definitions.js"
import { fromIterable } from "./fromIterable.js"
import { mapAccumM_ } from "./mapAccumM.js"

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results of type `S` given an initial S.
 */
export function scanM<S>(s: S) {
  return <R1, E1, O>(f: (s: S, o: O) => T.Effect<R1, E1, S>) =>
    <R, E>(self: Stream<R, E, O>): Stream<R & R1, E | E1, S> =>
      concat_(
        fromIterable([s]),
        mapAccumM_(self, s, (s, a) => T.map_(f(s, a), (s) => Tp.tuple(s, s)))
      )
}
