import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Sequence1 } from "fp-ts/lib/Traversable"

import { identity as id } from "../Function"

import type { Identity } from "./Identity"
import { URI } from "./URI"

export const sequence: Sequence1<URI> = <F>(F: Applicative<F>) => <A>(
  ta: Identity<HKT<F, A>>
): HKT<F, Identity<A>> => {
  return F.map(ta, id)
}
