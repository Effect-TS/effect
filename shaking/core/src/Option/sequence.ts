import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Option, URI } from "fp-ts/lib/Option"
import type { Sequence1 } from "fp-ts/lib/Traversable"

import { isNone } from "./isNone"
import { none } from "./none"
import { some } from "./some"

export const sequence: Sequence1<URI> = <F>(F: Applicative<F>) => <A>(
  ta: Option<HKT<F, A>>
): HKT<F, Option<A>> => {
  return isNone(ta) ? F.of(none) : F.map(ta.value, some)
}
