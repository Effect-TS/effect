import type { Managed } from "../definition"

/**
 * Provides the `Managed` effect with its required environment, which
 * eliminates its dependency on `R`.
 *
 * @tsplus fluent ets/Managed provideEnvironment
 */
export function provideEnvironment_<R, E, A>(
  self: Managed<R, E, A>,
  environment: R,
  __tsplusTrace?: string
): Managed<unknown, E, A> {
  return self.provideSomeEnvironment(() => environment)
}

/**
 * Provides the `Managed` effect with its required environment, which
 * eliminates its dependency on `R`.
 *
 * @ets_data_first provideEnvironment_
 */
export function provideEnvironment<R>(environment: R, __tsplusTrace?: string) {
  return <E, A>(self: Managed<R, E, A>): Managed<unknown, E, A> =>
    provideEnvironment_(self, environment)
}
