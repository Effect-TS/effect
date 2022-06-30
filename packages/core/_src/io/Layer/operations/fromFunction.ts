/**
 * Constructs a layer from the environment using the specified function.
 *
 * @tsplus static effect/core/io/Layer.Ops fromFunction
 */
export function fromFunction<A, B>(tagA: Tag<A>, tagB: Tag<B>, f: (a: A) => B): Layer<A, never, B> {
  return Layer.fromEffectEnvironment(Effect.serviceWith(tagA, (a) => Env(tagB, f(a))))
}
