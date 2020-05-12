import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Traverse1 } from "fp-ts/lib/Traversable"

import { URI } from "./URI"
import { traverseWithIndex_ } from "./traverseWithIndex_"

export const traverse_: Traverse1<URI> = <F>(
  F: Applicative<F>
): (<A, B>(
  ta: ReadonlyArray<A>,
  f: (a: A) => HKT<F, B>
) => HKT<F, ReadonlyArray<B>>) => {
  const traverseWithIndexF = traverseWithIndex_(F)
  return (ta, f) => traverseWithIndexF(ta, (_, a) => f(a))
}
