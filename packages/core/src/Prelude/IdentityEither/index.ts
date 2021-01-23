import type { AssociativeEither } from "../AssociativeEither"
import type { Auto, URIS } from "../HKT"
import type { None } from "../None"

export type IdentityEither<F extends URIS, C = Auto> = AssociativeEither<F, C> &
  None<F, C>
