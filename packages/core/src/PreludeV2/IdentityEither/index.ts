// ets_tracing: off

import type { AssociativeEither } from "../AssociativeEither/index.js"
import type * as HKT from "../HKT/index.js"
import type { None } from "../None/index.js"

export type IdentityEither<F extends HKT.HKT> = AssociativeEither<F> & None<F>
