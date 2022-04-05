import { releaseMapReleaseAll } from "@effect-ts/core/io/Effect/operations/excl-forEach"

/**
 * Runs the finalizers associated with this scope using the specified
 * execution strategy. After this action finishes, any finalizers added to
 * this scope will be run immediately.
 *
 * @tsplus fluent ets/ReleaseMap releaseAll
 */
export const releaseAll_ = releaseMapReleaseAll

/**
 * Runs the finalizers associated with this scope using the specified
 * execution strategy. After this action finishes, any finalizers added to
 * this scope will be run immediately.
 *
 * @tsplus static ets/ReleaseMap/Aspects releaseAll
 */
export const releaseAll = Pipeable(releaseAll_)
