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
 * @ets fluent ets/Managed provideServiceEffect
 */
export function provideServiceEffect_<R, E, A, R1, E1, T>(
  self: Managed<R & Has<T>, E, A>,
  tag: Tag<T>,
  effect: Effect<R1, E1, T>,
  __etsTrace?: string
): Managed<R1 & Erase<R & Has<T>, Has<T>>, E | E1, A> {
  // @ts-expect-error
  return Managed.environmentWithManaged((r: R & R1) =>
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
export function provideServiceEffect<T>(tag: Tag<T>, __etsTrace?: string) {
  return <R1, E1>(effect: Effect<R1, E1, T>) =>
    <R, E, A>(
      self: Managed<R & Has<T>, E, A>
    ): Managed<R1 & Erase<R & Has<T>, Has<T>>, E | E1, A> =>
      provideServiceEffect_<R, E, A, R1, E1, T>(self, tag, effect)
}
