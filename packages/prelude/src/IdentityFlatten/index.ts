import type { Auto, URIS } from "@effect-ts/hkt"

import type { Any } from "../Any"
import type { AssociativeFlatten } from "../AssociativeFlatten"

export type IdentityFlatten<F extends URIS, C = Auto> = AssociativeFlatten<F, C> &
  Any<F, C>
