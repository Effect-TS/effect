/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus fluent ets/Effect provideEnvironment
 */
export function provideEnvironment_<R, E, A>(
  self: Effect<R, E, A>,
  environment: LazyArg<Env<R>>,
  __tsplusTrace?: string
): Effect.IO<E, A> {
  return Effect.succeed(environment).flatMap((env) =>
    (self as Effect.IO<E, A>).apply(
      FiberRef.currentEnvironment.value.locally(env)
    )
  );
}

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static ets/Effect/Aspects provideEnvironment
 */
export const provideEnvironment = Pipeable(provideEnvironment_);
