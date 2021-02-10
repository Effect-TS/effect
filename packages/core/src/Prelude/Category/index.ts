import type { AssociativeCompose } from "../AssociativeCompose"
import type * as HKT from "../HKT"
import type { Id } from "../Id"

export interface Category<F extends HKT.URIS, C = HKT.Auto>
  extends Id<F, C>,
    AssociativeCompose<F, C> {}
