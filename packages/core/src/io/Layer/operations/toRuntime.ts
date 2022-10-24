/**
 * Converts a layer that requires no services into a scoped runtime, which can
 * be used to execute effects.
 *
 * @tsplus static effect/core/io/Layer.Aspects toRuntime
 * @tsplus fluent effect/core/io/Layer toRuntime
 * @category conversions
 * @since 1.0.0
 */
export function toRuntime<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
): Effect<RIn | Scope, E, Runtime<ROut>> {
  return Effect.scopeWith((scope) => self.buildWithScope(scope)).flatMap((environment) =>
    Effect.runtime<ROut>().provideEnvironment(environment)
  )
}
