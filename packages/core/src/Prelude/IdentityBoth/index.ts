// ets_tracing: off

import type { Any } from "../Any/index.js"
import type { AssociativeBoth } from "../AssociativeBoth/index.js"
import type { Auto, URIS } from "../HKT/index.js"

export interface IdentityBoth<F extends URIS, C = Auto>
  extends AssociativeBoth<F, C>,
    Any<F, C> {}
