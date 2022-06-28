/**
 * Projects out part of one of the services output by this layer using the
 * specified function.
 *
 * @tsplus static effect/core/io/Layer.Aspects project
 * @tsplus pipeable effect/core/io/Layer project
 */
export function project<A, B>(
  tagA: Tag<A>,
  tagB: Tag<B>,
  f: (a: A) => B
) {
  return <RIn, E, ROut>(self: Layer<RIn, E, ROut | A>): Layer<RIn, E, B> =>
    self.map((environment) => Env(tagB, f(environment.unsafeGet(tagA))))
}
