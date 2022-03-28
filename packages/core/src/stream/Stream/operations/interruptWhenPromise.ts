import type { LazyArg } from "../../../data/Function"
import type { Promise } from "../../../io/Promise"
import type { Stream } from "../../Stream"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Interrupts the evaluation of this stream when the provided promise
 * resolves. This combinator will also interrupt any in-progress element being
 * pulled from upstream.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 *
 * @tsplus fluent ets/Stream interruptWhenPromise
 */
export function interruptWhenPromise_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  promise: LazyArg<Promise<E2, Z>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A> {
  concreteStream(self)
  return new StreamInternal(self.channel.interruptWhenPromise(promise))
}

/**
 * Interrupts the evaluation of this stream when the provided promise
 * resolves. This combinator will also interrupt any in-progress element being
 * pulled from upstream.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export const interruptWhenPromise = Pipeable(interruptWhenPromise_)
