import type { Has, Tag } from "../../../data/Has"
import type { Stream } from "../definition"

/**
 * Updates a service in the environment of this stream.
 *
 * @tsplus fluent ets/Stream updateService
 */
export function updateService_<R, E, A, T>(self: Stream<R, E, A>, tag: Tag<T>) {
  return (f: (_: T) => T, __tsplusTrace?: string): Stream<R & Has<T>, E, A> =>
    self.provideSomeEnvironment((r) => ({ ...r, ...tag.has(f(tag.read(r))) }))
}

/**
 * Updates a service in the environment of this stream.
 */
export const updateService = Pipeable(updateService_)
