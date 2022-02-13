// ets_tracing: off

import type { AssociativeEither } from "../AssociativeEither"
import type * as HKT from "../HKT"
import type { None } from "../None"

export type IdentityEither<F extends HKT.HKT> = AssociativeEither<F> & None<F>
