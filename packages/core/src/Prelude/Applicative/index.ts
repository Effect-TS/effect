import type { Covariant } from "../Covariant"
import type { Auto, URIS } from "../HKT"
import type { IdentityBoth } from "../IdentityBoth"

export type Applicative<F extends URIS, C = Auto> = IdentityBoth<F, C> & Covariant<F, C>
