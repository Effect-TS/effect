import type { AssociativeCompose } from "../AssociativeCompose"
import type * as HKT from "../HKT"
import type { Id } from "../Id"

export type Category<F extends HKT.URIS, C = HKT.Auto> = Id<F, C> &
  AssociativeCompose<F, C>
