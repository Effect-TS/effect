/**
 * Projects out part of one of the services output by this layer using the
 * specified function.
 *
 * @tsplus fluent ets/Layer project
 */
export function project_<RIn, E, ROut, A, B>(
  self: Layer<RIn, E, ROut | A>,
  tagA: Tag<A>,
  tagB: Tag<B>,
  f: (a: A) => B
): Layer<RIn, E, B> {
  return self.map((environment) => Env(tagB, f(environment.unsafeGet(tagA))))
}

/**
 * Projects out part of one of the services output by this layer using the
 * specified function.
 *
 * @tsplus static ets/Layer/Aspects project
 */
export const project = Pipeable(project_)
