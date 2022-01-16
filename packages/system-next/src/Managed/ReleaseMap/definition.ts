// ets_tracing: off

import type * as R from "../operations/_internal/ref"
import type { State } from "./state"

/**
 * A `ReleaseMap` represents the finalizers associated with a scope.
 *
 * The design of `ReleaseMap` is inspired by ResourceT, written by Michael
 * Snoyman @snoyberg.
 * (https://github.com/snoyberg/conduit/blob/master/resourcet/Control/Monad/Trans/Resource/Internal.hs)
 */
export class ReleaseMap {
  constructor(readonly ref: R.Ref<State>) {}
}
