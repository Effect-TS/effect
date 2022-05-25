/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/Layer catchAll
 */
export function catchAll_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  handler: (e: E) => Layer<R2, E2, A2>
): Layer<R & R2, E2, A | A2> {
  return self.foldLayer(handler, (env) => Layer.succeedEnvironment(env))
}

/**
 * Recovers from all errors.
 *
 * @tsplus static ets/Layer/Aspects catchAll
 */
export const catchAll = Pipeable(catchAll_)
