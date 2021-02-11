import type { Auto, URIS } from "@effect-ts/hkt"

import type { Any } from "../Any"
import type { AssociativeBoth } from "../AssociativeBoth"

export type IdentityBoth<F extends URIS, C = Auto> = AssociativeBoth<F, C> & Any<F, C>
