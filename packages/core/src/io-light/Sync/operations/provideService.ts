import type { LazyArg } from "../../../data/Function"
import type { Has, Tag } from "../../../data/Has"
import type { Erase } from "../../../data/Utils"
import { Sync } from "../definition"

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Sync provideService
 */
export function provideService_<R, E, A, T>(self: Sync<R & Has<T>, E, A>, tag: Tag<T>) {
  return (service: LazyArg<T>, __tsplusTrace?: string): Sync<Erase<R, Has<T>>, E, A> =>
    // @ts-expect-error
    self.provideServiceSync(tag)(Sync.succeed(service))
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @ets_data_first provideService
 */
export function provideService<T>(tag: Tag<T>) {
  return (service: LazyArg<T>, __tsplusTrace?: string) =>
    <R, E, A>(self: Sync<R & Has<T>, E, A>): Sync<Erase<R, Has<T>>, E, A> =>
      // @ts-expect-error
      self.provideService(tag)(service)
}
