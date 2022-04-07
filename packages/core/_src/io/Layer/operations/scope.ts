import { ILayerScoped } from "@effect/core/io/Layer/definition";

/**
 * A layer that constructs a scope and closes it when the workflow the layer
 * is provided to completes execution, whether by success, failure, or
 * interruption. This can be used to close a scope when providing a layer to a
 * workflow.
 *
 * @tsplus static ets/Layer/Ops scope
 */
export const scope: Layer<unknown, never, Scope.Closeable> = Layer.suspend(
  new ILayerScoped(
    Effect.acquireReleaseExit(Scope.make, (scope, exit) => scope.close(exit))
  )
);
