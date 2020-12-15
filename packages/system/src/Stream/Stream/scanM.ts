import { pipe } from "../../Function"
import * as T from "../_internal/effect"
import { concat_ } from "./concat"
import type { Stream } from "./definitions"
import { fromIterable } from "./fromIterable"
import { mapAccumM } from "./mapAccumM"

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results of type `S` given an initial S.
 */
export function scanM<S>(s: S) {
  return <R1, E1, O>(f: (s: S, o: O) => T.Effect<R1, E1, S>) => <R, E>(
    self: Stream<R, E, O>
  ): Stream<R & R1, E | E1, S> =>
    concat_(
      fromIterable([s]),
      pipe(
        self,
        mapAccumM(s)((s, a) => T.map_(f(s, a), (s) => [s, s]))
      )
    )
}
