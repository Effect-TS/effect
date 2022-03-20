import type { Any } from "../Any/index.js"
import type { AssociativeBoth } from "../AssociativeBoth/index.js"
import type * as HKT from "../HKT/index.js"

export interface IdentityBoth<F extends HKT.HKT> extends AssociativeBoth<F>, Any<F> {}
