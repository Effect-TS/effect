import type { Has, Tag } from "../../../data/Has"
import { mergeEnvironments } from "../../../data/Has"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { environmentWithEffect } from "./environmentWithEffect"
import { provideEnvironment_ } from "./provideEnvironment"

/**
 * Provides the service with the required service entry.
 *
 * @ets fluent ets/Effect provideServiceEffect
 */
export function provideServiceEffect_<R1, E1, A1, R, E, T>(
  effect: Effect<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  service: Effect<R, E, T>,
  __etsTrace?: string
): Effect<R & R1, E | E1, A1> {
  return environmentWithEffect((r: R & R1) =>
    chain_(service, (t) =>
      provideEnvironment_(effect, mergeEnvironments(_, r, t), __etsTrace)
    )
  )
}

/**
 * Provides the service with the required service entry.
 */
export function provideServiceEffect<T>(_: Tag<T>) {
  return <R, E>(service: Effect<R, E, T>, __etsTrace?: string) =>
    <R1, E1, A1>(effect: Effect<R1 & Has<T>, E1, A1>): Effect<R & R1, E | E1, A1> =>
      environmentWithEffect((r: R & R1) =>
        chain_(service, (t) =>
          provideEnvironment_(effect, mergeEnvironments(_, r, t), __etsTrace)
        )
      )
}
