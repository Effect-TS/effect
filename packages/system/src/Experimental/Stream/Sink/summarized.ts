// ets_tracing: off

import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import type * as T from "../../../Effect/index.js"
import { pipe } from "../../../Function/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Summarize a sink by running an effect when the sink starts and again when it completes
 */
export function summarized_<R, R1, E1, InErr, In, OutErr, L, Z, B, C>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  summary: T.Effect<R1, E1, B>,
  f: (b1: B, b2: B) => C
): C.Sink<R1 & R, InErr, In, E1 | OutErr, L, Tp.Tuple<[Z, C]>> {
  return new C.Sink(
    pipe(
      CH.do,
      CH.bind("start", () => CH.fromEffect(summary)),
      CH.bind("done", () => self.channel),
      CH.bind("end", () => CH.fromEffect(summary)),
      CH.map(({ done, end, start }) => Tp.tuple(done, f(start, end)))
    )
  )
}

/**
 * Summarize a sink by running an effect when the sink starts and again when it completes
 * @ets_data_first summarized_
 */
export function summarized<R1, E1, B, C>(
  summary: T.Effect<R1, E1, B>,
  f: (b1: B, b2: B) => C
) {
  return <R, InErr, In, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    summarized_(self, summary, f)
}
