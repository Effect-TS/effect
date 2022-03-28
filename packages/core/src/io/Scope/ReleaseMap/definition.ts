import type { Ref } from "../../Ref"
import type { State } from "./state"

/**
 * A `ReleaseMap` represents the finalizers associated with a scope.
 *
 * The design of `ReleaseMap` is inspired by ResourceT, written by Michael
 * Snoyman @snoyberg.
 *
 * For mor information, see: https://github.com/snoyberg/conduit/blob/master/resourcet/Control/Monad/Trans/Resource/Internal.hs
 *
 * @tsplus type ets/ReleaseMap
 * @tsplus companion ets/ReleaseMapOps
 */
export class ReleaseMap {
  constructor(readonly ref: Ref<State>) {}
}

/**
 * @tsplus static ets/ReleaseMapOps __call
 */
export function releaseMapApply(ref: Ref<State>): ReleaseMap {
  return new ReleaseMap(ref)
}
