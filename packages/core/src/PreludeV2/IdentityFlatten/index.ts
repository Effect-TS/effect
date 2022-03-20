import type { Any } from "../Any/index.js"
import type { AssociativeFlatten } from "../AssociativeFlatten/index.js"
import type * as HKT from "../HKT/index.js"

export type IdentityFlatten<F extends HKT.HKT> = AssociativeFlatten<F> & Any<F>
