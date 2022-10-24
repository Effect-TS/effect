import { IUpdateRuntimeFlagsDynamic } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns a new Effect that will update the runtime flags according to
 * the specified patch within the scope of this Effect.
 *
 * @tsplus pipeable effect/core/io/Effect withRuntimeFlags
 * @category aspects
 * @since 1.0.0
 */
export function withRuntimeFlags(
  update: RuntimeFlags.Patch
): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> {
  return self => new IUpdateRuntimeFlagsDynamic(update, () => self)
}
