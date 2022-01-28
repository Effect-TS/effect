import type { Any } from "../Any"
import type { AssociativeBoth } from "../AssociativeBoth"
import type * as HKT from "../HKT"

export interface IdentityBoth<F extends HKT.HKT> extends AssociativeBoth<F>, Any<F> {}
