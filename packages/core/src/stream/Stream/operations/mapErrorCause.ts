import type { Cause } from "../../../io/Cause"
import type { Stream } from "../../Stream"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Transforms the full causes of failures emitted by this stream.
 *
 * @tsplus fluent ets/Stream mapErrorCause
 */
export function mapErrorCause_<R, E, E2, A>(
  self: Stream<R, E, A>,
  f: (e: Cause<E>) => Cause<E2>,
  __tsplusTrace?: string
): Stream<R, E2, A> {
  concreteStream(self)
  return new StreamInternal(self.channel.mapErrorCause(f))
}

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export const mapErrorCause = Pipeable(mapErrorCause_)
