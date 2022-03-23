import type { Has, Tag } from "../../../data/Has"
import { mergeEnvironments } from "../../../data/Has"
import type { Erase } from "../../../data/Utils"
import { Effect } from "../definition"

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Effect provideServiceEffect
 */
export function provideServiceEffect_<R, E, A, T>(
  self: Effect<R & Has<T>, E, A>,
  tag: Tag<T>
) {
  return <R1, E1>(
    effect: Effect<R1, E1, T>,
    __tsplusTrace?: string
  ): Effect<R1 & Erase<R, Has<T>>, E | E1, A> =>
    Effect.environmentWithEffect((r: R & R1) =>
      effect.flatMap((t) => self.provideEnvironment(mergeEnvironments(tag, r, t)))
    )
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @ets_data_first provideServiceEffect_
 */
export function provideServiceEffect<T>(tag: Tag<T>) {
  return <R1, E1>(effect: Effect<R1, E1, T>, __tsplusTrace?: string) =>
    <R, E, A>(
      self: Effect<R & Has<T>, E1, A>
    ): Effect<R1 & Erase<R, Has<T>>, E | E1, A> =>
      // @ts-expect-error
      self.provideServiceEffect(tag)(effect)
}
