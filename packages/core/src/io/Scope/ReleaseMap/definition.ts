import type { State } from "@effect/core/io/Scope/ReleaseMap/_internal/State"

/**
 * A `ReleaseMap` represents the finalizers associated with a scope.
 *
 * The design of `ReleaseMap` is inspired by ResourceT, written by Michael
 * Snoyman @snoyberg.
 *
 * For mor information, see: https://github.com/snoyberg/conduit/blob/master/resourcet/Control/Monad/Trans/Resource/Internal.hs
 *
 * @tsplus type effect/core/io/ReleaseMap
 * @category model
 * @since 1.0.0
 */
export interface ReleaseMap {
  readonly ref: Ref<State>
}

/**
 * @tsplus type effect/core/io/ReleaseMap.Ops
 * @category model
 * @since 1.0.0
 */
export interface ReleaseMapOps {
  (ref: Ref<State>): ReleaseMap
}

/**
 * @tsplus static effect/core/io/ReleaseMap.Ops __call
 */
export const ReleaseMap: ReleaseMapOps = (ref: Ref<State>): ReleaseMap => ({ ref })
