/**
 * Recovers from all non-fatal defects.
 *
 * @tsplus static effect/core/io/Effect.Aspects catchNonFatalOrDie
 * @tsplus pipeable effect/core/io/Effect catchNonFatalOrDie
 */
export function catchNonFatalOrDie<E, R2, E2, A2>(f: (e: E) => Effect<R2, E2, A2>) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A | A2> =>
    self.foldEffect(
      (e) =>
        Effect.runtime<never>()
          .flatMap((runtime) =>
            runtime.runtimeConfig.value.fatal(e) ?
              Effect.die(e) :
              f(e)
          ),
      Effect.succeed
    )
}
