import type { Any } from "../Any"
import type { AssociativeBoth } from "../AssociativeBoth"
import type { Auto, URIS } from "../HKT"

export type IdentityBoth<F extends URIS, C = Auto> = AssociativeBoth<F, C> & Any<F, C>
