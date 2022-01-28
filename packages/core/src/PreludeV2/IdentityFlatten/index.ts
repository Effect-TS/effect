import type { Any } from "../Any"
import type { AssociativeFlatten } from "../AssociativeFlatten"
import type * as HKT from "../HKT"

export type IdentityFlatten<F extends HKT.HKT> = AssociativeFlatten<F> & Any<F>
