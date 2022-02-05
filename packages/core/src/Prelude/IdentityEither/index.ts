// ets_tracing: off

import type { AssociativeEither } from "../AssociativeEither/index.js"
import type { Auto, URIS } from "../HKT/index.js"
import type { None } from "../None/index.js"

export type IdentityEither<F extends URIS, C = Auto> = AssociativeEither<F, C> &
  None<F, C>
