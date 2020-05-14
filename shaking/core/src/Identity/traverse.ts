import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Traverse1 } from "fp-ts/lib/Traversable"

import { identity as id } from "../Function"

import type { Identity } from "./Identity"
import { URI } from "./URI"

export const traverse: Traverse1<URI> = <F>(F: Applicative<F>) => <A, B>(
  ta: Identity<A>,
  f: (a: A) => HKT<F, B>
): HKT<F, Identity<B>> => {
  return F.map(f(ta), id)
}
