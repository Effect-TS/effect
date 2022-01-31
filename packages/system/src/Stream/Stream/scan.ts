// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { scanM } from "./scanM.js"

/**
 * Statefully maps over the elements of this stream to produce all intermediate results
 * of type `S` given an initial S.
 */
export function scan<S>(s: S) {
  return <O>(f: (s: S, o: O) => S) =>
    <R, E>(self: Stream<R, E, O>): Stream<R, E, S> =>
      pipe(
        self,
        scanM(s)((s, a) => T.succeed(f(s, a)))
      )
}
