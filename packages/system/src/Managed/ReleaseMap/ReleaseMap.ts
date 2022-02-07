// ets_tracing: off

import type * as R from "./deps-ref.js"
import type { State } from "./State.js"

export class ReleaseMap {
  constructor(readonly ref: R.Ref<State>) {}
}
