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
  );
}

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static ets/Effect/Aspects provideEnvironment
 */
export const provideEnvironment = Pipeable(provideEnvironment_);
