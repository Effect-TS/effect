import { FiberRef } from "../../FiberRef"
import type { Effect, IO } from "../definition"

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus fluent ets/Effect provideEnvironment
 */
export function provideEnvironment_<R, E, A>(
  self: Effect<R, E, A>,
  environment: R,
  __tsplusTrace?: string
): IO<E, A> {
  return (self as IO<E, A>).apply(
    FiberRef.currentEnvironment.value.locally(environment)
  )
}

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @ets_data_first provideEnvironment_
 */
export function provideEnvironment<R>(environment: R, __tsplusTrace?: string) {
  return <E, A>(self: Effect<R, E, A>): IO<E, A> => self.provideEnvironment(environment)
}
