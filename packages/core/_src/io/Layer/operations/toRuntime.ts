/**
 * Converts a layer that requires no services into a scoped runtime, which can
 * be used to execute effects.
 *
 * @tsplus fluent ets/Layer toRuntime
 */
export function toRuntime_<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>,
  runtimeConfig: RuntimeConfig
): Effect<RIn & Has<Scope>, E, Runtime<ROut>> {
  return Effect
    .scopeWith((scope) => self.buildWithScope(scope))
    .provideSomeEnvironment((env: Env<RIn & Has<Scope>>) => Env().merge(env))
    .map((environment) => new Runtime(environment, runtimeConfig));
}

/**
 * Converts a layer that requires no services into a scoped runtime, which can
 * be used to execute effects.
 *
 * @tsplus static ets/Layer/Aspects toRuntime
 */
export const toRuntime = Pipeable(toRuntime_);
