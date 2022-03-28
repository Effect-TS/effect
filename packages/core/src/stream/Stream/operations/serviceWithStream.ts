import type { Has, Tag } from "../../../data/Has"
import { Stream } from "../definition"

/**
 * Accesses the specified service in the environment of the stream in the
 * context of a stream.
 *
 * @tsplus static ets/StreamOps serviceWithStream
 */
export function serviceWithStream<T>(tag: Tag<T>) {
  return <R, E, A>(
    f: (a: T) => Stream<R, E, A>,
    __tsplusTrace?: string
  ): Stream<R & Has<T>, E, A> => Stream.service(tag).flatMap(f)
}
