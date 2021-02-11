import type { Auto, URIS } from "@effect-ts/hkt"

import type { Covariant } from "../Covariant"
import type { IdentityBoth } from "../IdentityBoth"

export interface Applicative<F extends URIS, C = Auto>
  extends IdentityBoth<F, C>,
    Covariant<F, C> {}
