// tracing: off

import type * as R from "./deps-ref"
import type { State } from "./State"

export class ReleaseMap {
  constructor(readonly ref: R.Ref<State>) {}
}
