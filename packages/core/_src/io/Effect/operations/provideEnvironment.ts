/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static effect/core/io/Effect.Aspects provideEnvironment
 * @tsplus pipeable effect/core/io/Effect provideEnvironment
 */
export function provideEnvironment<R>(environment: LazyArg<Env<R>>, __tsplusTrace?: string) {
  return <E, A>(self: Effect<R, E, A>): Effect<never, E, A> =>
    Effect.succeed(environment).flatMap((env) =>
      (self as Effect<never, E, A>).apply(
        FiberRef.currentEnvironment.value.locally(env)
      )
    )
}
