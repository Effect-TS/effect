import type { Managed } from "../definition"
import { provideSomeEnvironment_ } from "./provideSomeEnvironment"

/**
 * Provides the `Managed` effect with its required environment, which
 * eliminates its dependency on `R`.
 */
export function provideEnvironment_<R, E, A>(
  self: Managed<R, E, A>,
  environment: R,
  __trace?: string
): Managed<unknown, E, A> {
  return provideSomeEnvironment_(self, () => environment, __trace)
}

/**
 * Provides the `Managed` effect with its required environment, which
 * eliminates its dependency on `R`.
 *
 * @ets_data_first provideEnvironment_
 */
export function provideEnvironment<R>(environment: R, __trace?: string) {
  return <E, A>(self: Managed<R, E, A>): Managed<unknown, E, A> =>
    provideEnvironment_(self, environment, __trace)
}
