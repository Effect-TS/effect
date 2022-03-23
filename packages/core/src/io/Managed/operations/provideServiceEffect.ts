import type { Has, Tag } from "../../../data/Has"
import { mergeEnvironments } from "../../../data/Has"
import type { Erase } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Provides the `Managed` effect with the single service it requires. If the
 * managed effect requires more than one service use `provideEnvironment`
 * instead.
 *
 * @tsplus fluent ets/Managed provideServiceEffect
 */
export function provideServiceEffect_<R, E, A, T>(
  self: Managed<R & Has<T>, E, A>,
  tag: Tag<T>
) {
  return <R1, E1>(
    effect: Effect<R1, E1, T>,
    __tsplusTrace?: string
  ): Managed<R1 & Erase<R, Has<T>>, E | E1, A> =>
    Managed.environmentWithManaged((r: R & R1) =>
      Managed.fromEffect(effect).flatMap((t) =>
        self.provideEnvironment(mergeEnvironments(tag, r, t))
      )
    )
}

/**
 * Provides the `Managed` effect with the single service it requires. If the
 * managed effect requires more than one service use `provideEnvironment`
 * instead.
 *
 * @ets_data_first provideServiceEffect_
 */
export function provideServiceEffect<T>(tag: Tag<T>) {
  return <R1, E1>(effect: Effect<R1, E1, T>) =>
    <R, E, A>(
      self: Managed<R & Has<T>, E, A>,
      __tsplusTrace?: string
    ): Managed<R1 & Erase<R, Has<T>>, E | E1, A> =>
      // @ts-expect-error
      self.provideServiceEffect(tag)(effect)
}
