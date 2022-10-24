import { releaseMapReleaseAll } from "@effect/core/io/Effect/operations/excl-forEach"

/**
 * Runs the finalizers associated with this scope using the specified
 * execution strategy. After this action finishes, any finalizers added to
 * this scope will be run immediately.
 *
 * @tsplus static effect/core/io/ReleaseMap.Aspects releaseAll
 * @tsplus pipeable effect/core/io/ReleaseMap releaseAll
 * @category mutations
 * @since 1.0.0
 */
export function releaseAll(ex: Exit<unknown, unknown>, execStrategy: ExecutionStrategy) {
  return (self: ReleaseMap): Effect<never, never, unknown> => {
    return releaseMapReleaseAll(self, ex, execStrategy)
  }
}
