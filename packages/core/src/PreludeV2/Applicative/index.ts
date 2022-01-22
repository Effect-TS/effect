import type { Covariant } from "../Covariant/index.js"
import type * as HKT from "../HKT/index.js"
import type { IdentityBoth } from "../IdentityBoth/index.js"

export interface Applicative<F extends HKT.HKT> extends IdentityBoth<F>, Covariant<F> {}
