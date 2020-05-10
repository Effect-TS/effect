import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"
import { none } from "./none"
import { some } from "./some"

export const traverse = <F>(F: Applicative<F>) => <A, B>(
  ta: Option<A>,
  f: (a: A) => HKT<F, B>
): HKT<F, Option<B>> => {
  return isNone(ta) ? F.of(none) : F.map(f(ta.value), some)
}
