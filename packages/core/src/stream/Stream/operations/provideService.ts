import type { LazyArg } from "../../../data/Function"
import type { Has, Tag } from "../../../data/Has"
import type { Erase } from "../../../data/Utils"
import type { Stream } from "../definition"

/**
 * Provides the stream with the single service it requires. If the stream
 * requires multiple services use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Stream provideService
 */
export function provideService_<R, E, A, T>(
  self: Stream<R & Has<T>, E, A>,
  tag: Tag<T>
) {
  return (
    service: LazyArg<T>,
    __tsplusTrace?: string
  ): Stream<Erase<R, Has<T>>, E, A> =>
    // @ts-expect-error
    self.provideServiceEffect(tag)(Effect.succeed(service))
}

/**
 * Provides the stream with the single service it requires. If the stream
 * requires multiple services use `provideEnvironment` instead.
 */
export const provideService = Pipeable(provideService_)
