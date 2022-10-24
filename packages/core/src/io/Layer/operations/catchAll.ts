/**
 * Recovers from all errors.
 *
 * @tsplus static effect/core/io/Layer.Aspects catchAll
 * @tsplus pipeable effect/core/io/Layer catchAll
 * @category alternatives
 * @since 1.0.0
 */
export function catchAll<E, R2, E2, A2>(
  handler: (e: E) => Layer<R2, E2, A2>
) {
  return <R, A>(self: Layer<R, E, A>): Layer<R | R2, E2, A & A2> =>
    self.foldLayer(handler, (env) => Layer.succeedEnvironment(env))
}
