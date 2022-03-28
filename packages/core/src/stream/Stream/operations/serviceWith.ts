import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Accesses the specified service in the environment of the stream.
 *
 * @tsplus static ets/StreamOps serviceWith
 */
export function serviceWith<T>(tag: Tag<T>) {
  return <A>(f: (a: T) => A, __tsplusTrace?: string): Stream<Has<T>, never, A> =>
    Stream.fromEffect(Effect.serviceWith(tag)(f))
}
