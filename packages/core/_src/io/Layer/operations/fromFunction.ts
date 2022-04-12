/**
 * Constructs a layer from the environment using the specified function.
 *
 * @tsplus static ets/Layer/Ops fromFunction
 */
export function fromFunction<A, B>(tagA: Tag<A>, tagB: Tag<B>) {
  return (f: (a: A) => B): Layer<Has<A>, never, Has<B>> =>
    Layer.fromEffectEnvironment(
      Effect.serviceWith(tagA)((a) => Env().add(tagB, f(a)))
    );
}
