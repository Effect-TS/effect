import type { LazyArg } from "../../../data/Function"
import type { Has, Tag } from "../../../data/Has"
import type { Erase } from "../../../data/Utils"
import { Managed } from "../definition"

/**
 * Provides the `Managed` effect with the single service it requires. If the
 * managed effect requires more than one service use `provideEnvironment`
 * instead.
 *
 * @tsplus fluent ets/Managed provideService
 */
export function provideService_<R, E, A, T>(
  self: Managed<R & Has<T>, E, A>,
  tag: Tag<T>
) {
  return (service: LazyArg<T>, __etsTrace?: string): Managed<Erase<R, Has<T>>, E, A> =>
    // @ts-expect-error
    self.provideServiceManaged(tag)(Managed.succeed(service))
}

/**
 * Provides the `Managed` effect with the single service it requires. If the
 * managed effect requires more than one service use `provideEnvironment`
 * instead.
 *
 * @ets_data_first provideService_
 */
export function provideService<T>(tag: Tag<T>) {
  return (service: LazyArg<T>, __etsTrace?: string) =>
    <R, E, A>(self: Managed<R & Has<T>, E, A>): Managed<Erase<R, Has<T>>, E, A> =>
      // @ts-expect-error
      self.provideService(tag)(service)
}
