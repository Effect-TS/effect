import type { Has, Tag } from "../../../data/Has"
import { mergeEnvironments } from "../../../data/Has"
import type { Erase } from "../../../data/Utils"
import { Managed } from "../definition"

/**
 * Provides the `Managed` effect with the single service it requires. If the
 * managed effect requires more than one service use `provideEnvironment`
 * instead.
 *
 * @tsplus fluent ets/Managed provideServiceManaged
 */
export function provideServiceManaged_<R, E, A, T>(
  self: Managed<R & Has<T>, E, A>,
  tag: Tag<T>,
  __etsTrace?: string
) {
  return <R1, E1>(
    managed: Managed<R1, E1, T>
  ): Managed<R1 & Erase<R & Has<T>, Has<T>>, E | E1, A> => {
    // @ts-expect-error
    return Managed.environmentWithManaged((r: R & R1) =>
      managed.flatMap((t) => self.provideEnvironment(mergeEnvironments(tag, r, t)))
    )
  }
}

/**
 * Provides the `Managed` effect with the single service it requires. If the
 * managed effect requires more than one service use `provideEnvironment`
 * instead.
 *
 * @ets_data_first provideServiceManaged_
 */
export function provideServiceManaged<T>(tag: Tag<T>, __etsTrace?: string) {
  return <R1, E1>(managed: Managed<R1, E1, T>) =>
    <R, E, A>(
      self: Managed<R & Has<T>, E, A>
    ): Managed<R1 & Erase<R & Has<T>, Has<T>>, E | E1, A> => {
      return provideServiceManaged_(self, tag)(managed)
    }
}
