import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { TraverseWithIndex1 } from "fp-ts/lib/TraversableWithIndex"

import { URI } from "./URI"
import { reduceWithIndex_ } from "./reduceWithIndex_"
import { snoc } from "./snoc"
import { zero } from "./zero"

export const traverseWithIndex: TraverseWithIndex1<URI, number> = <F>(
  F: Applicative<F>
) => <A, B>(
  ta: ReadonlyArray<A>,
  f: (i: number, a: A) => HKT<F, B>
): HKT<F, ReadonlyArray<B>> => {
  return reduceWithIndex_(ta, F.of<ReadonlyArray<B>>(zero()), (i, fbs, a) =>
    F.ap(
      F.map(fbs, (bs) => (b: B) => snoc(bs, b)),
      f(i, a)
    )
  )
}
