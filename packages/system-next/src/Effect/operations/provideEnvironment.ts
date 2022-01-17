import { currentEnvironment } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Effect, IO } from "../definition"

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 */
export function provideEnvironment_<R, E, A>(
  self: Effect<R, E, A>,
  environment: R,
  __trace?: string
): IO<E, A> {
  return locally_(currentEnvironment.value, environment, self as IO<E, A>, __trace)
}

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @ets_data_first provideEnvironment_
 */
export function provideEnvironment<R>(environment: R, __trace?: string) {
  return <E, A>(self: Effect<R, E, A>): IO<E, A> =>
    provideEnvironment_(self, environment, __trace)
}
