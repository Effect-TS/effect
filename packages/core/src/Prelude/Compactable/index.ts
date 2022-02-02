// ets_tracing: off

import type { Compact } from "../Compact/index.js"
import type { Auto, URIS } from "../HKT/index.js"
import type { Separate } from "../Separate/index.js"

export interface Compactable<F extends URIS, C = Auto>
  extends Compact<F, C>,
    Separate<F, C> {}
