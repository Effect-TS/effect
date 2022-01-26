import type { Has, Tag } from "../../../data/Has"
import { mergeEnvironments } from "../../../data/Has"
import { Managed } from "../definition"

/**
 * Provides the service with the required service entry.
 *
 * @ets fluent ets/Managed provideServiceManaged
 */
export function provideServiceManaged_<R, E, A, R1, E1, T>(
  self: Managed<R & Has<T>, E, A>,
  tag: Tag<T>,
  __etsTrace?: string
) {
  return (managed: Managed<R1, E1, T>): Managed<R & R1, E | E1, A> => {
    return Managed.environmentWithManaged((r: R & R1) =>
      managed.flatMap((t) => self.provideEnvironment(mergeEnvironments(tag, r, t)))
    )
  }
}

/**
 * Provides the service with the required service entry.
 *
 * @ets_data_first provideServiceManaged_
 */
export function provideServiceManaged<T>(tag: Tag<T>, __etsTrace?: string) {
  return <R1, E1>(managed: Managed<R1, E1, T>) =>
    <R, E, A>(self: Managed<R & Has<T>, E, A>): Managed<R & R1, E | E1, A> =>
      provideServiceManaged_<R, E, A, R1, E1, T>(self, tag)(managed)
}
