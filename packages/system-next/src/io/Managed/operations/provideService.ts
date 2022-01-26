import type { Has, Tag } from "../../../data/Has"
import { Managed } from "../definition"
import { provideServiceManaged } from "./provideServiceManaged"
import { succeedNow } from "./succeedNow"

/**
 * Provides the service with the required service entry.
 *
 * @ets fluent ets/Managed provideService
 */
export function provideService_<R, E, A, T>(
  self: Managed<R & Has<T>, E, A>,
  tag: Tag<T>,
  __etsTrace?: string
) {
  return (service: T): Managed<R, E, A> =>
    self.provideServiceManaged(tag)(Managed.succeedNow(service)) as Managed<R, E, A>
}

/**
 * Provides the service with the required service entry.
 */
export function provideService<T>(_: Tag<T>) {
  return (service: T) =>
    <R1, E1, A1>(ma: Managed<R1 & Has<T>, E1, A1>): Managed<R1, E1, A1> =>
      provideServiceManaged(_)(succeedNow(service))(ma)
}
