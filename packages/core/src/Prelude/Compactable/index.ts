// ets_tracing: off

import type { Compact } from "../Compact"
import type { Auto, URIS } from "../HKT"
import type { Separate } from "../Separate"

export interface Compactable<F extends URIS, C = Auto>
  extends Compact<F, C>,
    Separate<F, C> {}
