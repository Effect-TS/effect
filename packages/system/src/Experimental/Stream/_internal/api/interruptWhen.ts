// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Interrupts the evaluation of this stream when the provided IO completes. The given
 * IO will be forked as part of this stream, and its success will be discarded. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the IO completes with a failure before the stream completes, the returned stream
 * will emit that failure.
 */
export function interruptWhen_<R, R1, E, E1, A, Z>(
  self: C.Stream<R, E, A>,
  io: T.Effect<R1, E1, Z>
): C.Stream<R1 & R, E | E1, A> {
  return new C.Stream(CH.interruptWhen_(self.channel, io))
}

/**
 * Interrupts the evaluation of this stream when the provided IO completes. The given
 * IO will be forked as part of this stream, and its success will be discarded. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the IO completes with a failure before the stream completes, the returned stream
 * will emit that failure.
 *
 * @ets_data_first interruptWhen_
 */
export function interruptWhen<R1, E1, Z>(io: T.Effect<R1, E1, Z>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => interruptWhen_(self, io)
}
