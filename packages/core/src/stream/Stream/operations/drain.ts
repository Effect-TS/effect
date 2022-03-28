import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Converts this stream to a stream that executes its effects but emits no
 * elements. Useful for sequencing effects using streams.
 *
 * @tsplus fluent ets/Stream drain
 */
export function drain<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R, E, never> {
  concreteStream(self)
  return new StreamInternal(self.channel.drain())
}
