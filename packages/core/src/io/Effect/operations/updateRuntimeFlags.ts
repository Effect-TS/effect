import { IUpdateRuntimeFlags } from "@effect/core/io/Effect/definition/primitives"

/**
 * Updates the runtime flags. This may have a performance impact. For a
 * higher-performance variant, see `ZIO#withRuntimeFlags`.
 *
 * @tsplus static effect/core/io/Effect.Ops updateRuntimeFlags
 * @category constructors
 * @since 1.0.0
 */
export function updateRuntimeFlags(
  patch: RuntimeFlags.Patch
): Effect<never, never, void> {
  return new IUpdateRuntimeFlags(patch)
}
