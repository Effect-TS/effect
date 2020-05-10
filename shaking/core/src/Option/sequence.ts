import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"
import { none } from "./none"
import { some } from "./some"

export const sequence = <F>(F: Applicative<F>) => <A>(
  ta: Option<HKT<F, A>>
): HKT<F, Option<A>> => {
  return isNone(ta) ? F.of(none) : F.map(ta.value, some)
}
