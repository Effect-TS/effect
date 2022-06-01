/**
 * Constructs a layer from the environment using the specified function.
 *
 * @tsplus static ets/Layer/Ops fromFunction
 */
export function fromFunction<A, B>(tagA: Tag<A>, tagB: Tag<B>) {
  return (f: (a: A) => B): Layer<A, never, B> =>
    Layer.fromEffectEnvironment(
      Effect.serviceWith(tagA)((a) => Env(tagB, f(a)))
    )
}
