/**
 * Performs the specified effect if this layer fails.
 *
 * @tsplus static effect/core/io/Layer.Aspects tapError
 * @tsplus pipeable effect/core/io/Layer tapError
 */
export function tapError<E, RIn2, E2, X>(f: (e: E) => Effect<RIn2, E2, X>) {
  return <RIn, ROut>(self: Layer<RIn, E, ROut>): Layer<RIn | RIn2, E | E2, ROut> =>
    self.catchAll((e) => Layer.fromEffectEnvironment(f(e).flatMap(() => Effect.fail(e))))
}
