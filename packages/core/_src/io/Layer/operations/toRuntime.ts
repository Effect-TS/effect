/**
 * Converts a layer that requires no services into a scoped runtime, which can
 * be used to execute effects.
 *
 * @tsplus static effect/core/io/Layer.Aspects toRuntime
 * @tsplus pipeable effect/core/io/Layer toRuntime
 */
export function toRuntime(runtimeConfig: RuntimeConfig) {
  return <RIn, E, ROut>(self: Layer<RIn, E, ROut>): Effect<RIn | Scope, E, Runtime<ROut>> =>
    Effect
      .scopeWith((scope) => self.buildWithScope(scope))
      .map((environment) => new Runtime(environment, runtimeConfig))
}
