// ets_tracing: off

import type { Any } from "../Any"
import type { AssociativeBoth } from "../AssociativeBoth"
import type { Auto, URIS } from "../HKT"

export interface IdentityBoth<F extends URIS, C = Auto>
  extends AssociativeBoth<F, C>,
    Any<F, C> {}
