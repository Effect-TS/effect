import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @tsplus fluent ets/Stream map
 */
export function map_<R, E, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => B,
  __tsplusTrace?: string
): Stream<R, E, B> {
  concreteStream(self)
  return new StreamInternal(self.channel.mapOut((chunk) => chunk.map(f)))
}

/**
 * Transforms the elements of this stream using the supplied function.
 */
export const map = Pipeable(map_)
