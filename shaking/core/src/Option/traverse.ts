import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Option, URI } from "fp-ts/lib/Option"
import { Traverse1 } from "fp-ts/lib/Traversable"

import { isNone } from "./isNone"
import { none } from "./none"
import { some } from "./some"

export const traverse: Traverse1<URI> = <F>(F: Applicative<F>) => <A, B>(
  ta: Option<A>,
  f: (a: A) => HKT<F, B>
): HKT<F, Option<B>> => {
  return isNone(ta) ? F.of(none) : F.map(f(ta.value), some)
}
