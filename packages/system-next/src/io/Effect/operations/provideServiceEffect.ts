import type { Has, Tag } from "../../../data/Has"
import { mergeEnvironments } from "../../../data/Has"
import { Effect } from "../definition"

/**
 * Provides the service with the required service entry.
 *
 * @ets fluent ets/Effect provideServiceEffect
 */
export function provideServiceEffect_<R1, E1, A1, R, E, T>(
  self: Effect<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  service: Effect<R, E, T>,
  __etsTrace?: string
): Effect<R & R1, E | E1, A1> {
  return Effect.environmentWithEffect((r: R & R1) =>
    service.flatMap((t) => self.provideEnvironment(mergeEnvironments(_, r, t)))
  )
}

/**
 * Provides the service with the required service entry.
 */
export function provideServiceEffect<T>(_: Tag<T>) {
  return <R, E>(service: Effect<R, E, T>, __etsTrace?: string) =>
    <R1, E1, A1>(self: Effect<R1 & Has<T>, E1, A1>): Effect<R & R1, E | E1, A1> =>
      provideServiceEffect_<R1, E1, A1, R, E, T>(self, _, service)
}
