import type { Effect } from "../../Effect/definition"
import { chain_ } from "../../Effect/operations/chain"
import { environmentWithEffect } from "../../Effect/operations/environmentWithEffect"
import { provideEnvironment_ } from "../../Effect/operations/provideEnvironment"
import type { Has, Tag } from "../../Has"
import { mergeEnvironments } from "../../Has"

/**
 * Provides the service with the required service entry.
 *
 * @ets fluent ets/Effect provideServiceEffect
 */
export function provideServiceEffect_<R1, E1, A1, R, E, T>(
  effect: Effect<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  service: Effect<R, E, T>,
  __trace?: string
): Effect<R & R1, E | E1, A1> {
  return environmentWithEffect((r: R & R1) =>
    chain_(service, (t) =>
      provideEnvironment_(effect, mergeEnvironments(_, r, t), __trace)
    )
  )
}

/**
 * Provides the service with the required service entry.
 */
export function provideServiceEffect<T>(_: Tag<T>) {
  return <R, E>(service: Effect<R, E, T>, __trace?: string) =>
    <R1, E1, A1>(effect: Effect<R1 & Has<T>, E1, A1>): Effect<R & R1, E | E1, A1> =>
      environmentWithEffect((r: R & R1) =>
        chain_(service, (t) =>
          provideEnvironment_(effect, mergeEnvironments(_, r, t), __trace)
        )
      )
}
