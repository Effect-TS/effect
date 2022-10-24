import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * A layer that constructs a scope and closes it when the workflow the layer
 * is provided to completes execution, whether by success, failure, or
 * interruption. This can be used to close a scope when providing a layer to a
 * workflow.
 *
 * @tsplus static effect/core/io/Layer.Ops scope
 * @category constructors
 * @since 1.0.0
 */
export const scope: Layer<never, never, Scope.Closeable> = Layer.scopedEnvironment(
  Effect.acquireReleaseExit(
    Scope.make,
    (scope, exit) => scope.close(exit)
  ).map((scope) => pipe(Context.empty(), Context.add(Scope.Tag)(scope)))
)
