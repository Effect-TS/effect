/**
 * @tsplus static effect/core/io/Effect.Ops fiberIdWith
 * @category constructors
 * @since 1.0.0
 */
export function fiberIdWith<R, E, A>(
  f: (descriptor: FiberId.Runtime) => Effect<R, E, A>
): Effect<R, E, A> {
  return Effect.withFiberRuntime((state) => f(state.id))
}
