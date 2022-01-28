import type { Covariant } from "../Covariant"
import type * as HKT from "../HKT"
import type { IdentityBoth } from "../IdentityBoth"

export interface Applicative<F extends HKT.HKT> extends IdentityBoth<F>, Covariant<F> {}
