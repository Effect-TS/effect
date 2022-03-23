import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { Stream } from "../../Stream"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Interrupts the evaluation of this stream when the provided effect completes.
 * The given effect will be forked as part of this stream, and its success will
 * be discarded. This combinator will also interrupt any in-progress element
 * being pulled from upstream.
 *
 * If the effect completes with a failure before the stream completes, the
 * returned stream will emit that failure.
 *
 * @tsplus fluent ets/Stream interruptWhen
 */
export function interruptWhen_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  effect: LazyArg<Effect<R2, E2, Z>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A> {
  concreteStream(self)
  return new StreamInternal(self.channel.interruptWhen(effect))
}

/**
 * Interrupts the evaluation of this stream when the provided effect completes.
 * The given effect will be forked as part of this stream, and its success will
 * be discarded. This combinator will also interrupt any in-progress element
 * being pulled from upstream.
 *
 * If the effect completes with a failure before the stream completes, the
 * returned stream will emit that failure.
 */
export const interruptWhen = Pipeable(interruptWhen_)
