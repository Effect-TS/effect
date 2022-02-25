import type { LazyArg } from "../../../data/Function"
import type { Has, Tag } from "../../../data/Has"
import type { Erase } from "../../../data/Utils"
import { Effect } from "../definition"

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Effect provideService
 */
export function provideService_<R, E, A, T>(
  self: Effect<R & Has<T>, E, A>,
  tag: Tag<T>
) {
  return (
    service: LazyArg<T>,
    __tsplusTrace?: string
  ): Effect<Erase<R, Has<T>>, E, A> =>
    // @ts-expect-error
    self.provideServiceEffect(tag)(Effect.succeed(service))
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @ets_data_first provideService
 */
export function provideService<T>(tag: Tag<T>) {
  return (service: LazyArg<T>, __tsplusTrace?: string) =>
    <R, E, A>(self: Effect<R & Has<T>, E, A>): Effect<Erase<R, Has<T>>, E, A> =>
      // @ts-expect-error
      self.provideService(tag)(service)
}
