import type { Auto, URIS } from "@effect-ts/hkt"

import type { AssociativeEither } from "../AssociativeEither"
import type { None } from "../None"

export type IdentityEither<F extends URIS, C = Auto> = AssociativeEither<F, C> &
  None<F, C>
