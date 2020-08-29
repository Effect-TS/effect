import type { Any } from "../Any"
import type { AssociativeFlatten } from "../AssociativeFlatten"
import type { Auto, URIS } from "../HKT"

export type IdentityFlatten<F extends URIS, C = Auto> = AssociativeFlatten<F, C> &
  Any<F, C>
