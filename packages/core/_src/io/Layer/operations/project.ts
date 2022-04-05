/**
 * Projects out part of one of the services output by this layer using the
 * specified function.
 *
 * @tsplus fluent ets/Layer project
 */
export function project_<RIn, E, ROut, T, B>(
  self: Layer<RIn, E, ROut & Has<T>>,
  service: Service<T>,
  f: (_: T) => Has<B>
): Layer<RIn, E, Has<B>> {
  return self.map((environment) => f(service.get(environment)));
}

/**
 * Projects out part of one of the services output by this layer using the
 * specified function.
 *
 * @tsplus static ets/Layer/Aspects project
 */
export const project = Pipeable(project_);
