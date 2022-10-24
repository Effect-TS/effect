/**
 * Provides a layer to the effect, which translates it to another level.
 *
 * @tsplus static effect/core/io/Effect.Aspects provideLayer
 * @tsplus pipeable effect/core/io/Effect provideLayer
 * @category environment
 * @since 1.0.0
 */
export function provideLayer<R, E, A>(layer: Layer<R, E, A>) {
  return <E1, A1>(self: Effect<A, E1, A1>): Effect<R, E | E1, A1> =>
    Effect.acquireUseReleaseExit(
      Scope.make,
      (scope) => layer.buildWithScope(scope).flatMap((r) => self.provideEnvironment(r)),
      (scope, exit) => scope.close(exit)
    )
}
