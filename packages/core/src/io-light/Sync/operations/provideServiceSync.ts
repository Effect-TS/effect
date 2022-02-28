import type { Has, Tag } from "../../../data/Has"
import { mergeEnvironments } from "../../../data/Has"
import type { Erase } from "../../../data/Utils"
import { Sync } from "../definition"

/**
 * Provides the computation with the single service it requires. If the
 * computation requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Sync provideServiceSync
 */
export function provideServiceSync_<R, E, A, T>(
  self: Sync<R & Has<T>, E, A>,
  tag: Tag<T>
) {
  return <R1, E1>(
    sync: Sync<R1, E1, T>,
    __tsplusTrace?: string
  ): Sync<R1 & Erase<R, Has<T>>, E | E1, A> =>
    // @ts-expect-error
    Sync.environmentWithSync((r: R & R1) =>
      sync.flatMap((t) => self.provideEnvironment(mergeEnvironments(tag, r, t)))
    )
}

/**
 * Provides the computation with the single service it requires. If the
 * computation requires more than one service use `provideEnvironment` instead.
 *
 * @ets_data_first provideServiceSync_
 */
export function provideServiceSync<T>(tag: Tag<T>) {
  return <R1, E1>(sync: Sync<R1, E1, T>, __tsplusTrace?: string) =>
    <R, E, A>(self: Sync<R & Has<T>, E1, A>): Sync<R1 & Erase<R, Has<T>>, E | E1, A> =>
      // @ts-expect-error
      self.provideServiceSync(tag)(sync)
}
