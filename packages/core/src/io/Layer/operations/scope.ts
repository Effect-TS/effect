/**
 * A layer that constructs a scope and closes it when the workflow the layer
 * is provided to completes execution, whether by success, failure, or
 * interruption. This can be used to close a scope when providing a layer to a
 * workflow.
 *
 * @tsplus static effect/core/io/Layer.Ops scope
 */
export const scope: Layer<never, never, Scope.Closeable> = Layer.scopedEnvironment(
  Effect.acquireReleaseExit(
    Scope.make,
    (scope, exit) => scope.close(exit)
  ).map((scope) => Env(Scope.Tag, scope)) as Effect<Scope, never, Env<Scope.Closeable>>
)
