// ets_tracing: off

import type * as P from "../../../../Promise/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Interrupts the evaluation of this stream when the provided promise resolves. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function interruptWhenP_<R, E, A, E1>(
  self: C.Stream<R, E, A>,
  p: P.Promise<E1, never>
): C.Stream<R, E | E1, A> {
  return new C.Stream(CH.interruptWhenP_(self.channel, p))
}

/**
 * Interrupts the evaluation of this stream when the provided promise resolves. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 *
 * @ets_data_first interruptWhenP_
 */
export function interruptWhenP<E1>(p: P.Promise<E1, never>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => interruptWhenP_(self, p)
}
