/**
 * Lazily constructs a layer from the specified value, which must return one or more
 * services.
 *
 * @tsplus static effect/core/io/Layer.Ops syncEnvironment
 */
export function syncEnvironment<A>(a: LazyArg<Env<A>>): Layer<never, never, A> {
  return Layer.fromEffectEnvironment(Effect.sync(a))
}
