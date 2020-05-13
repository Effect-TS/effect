import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Sequence1 } from "fp-ts/lib/Traversable"

import { URI } from "./URI"
import { reduce_ } from "./reduce_"
import { snoc } from "./snoc"
import { zero } from "./zero"

export const sequence: Sequence1<URI> = <F>(F: Applicative<F>) => <A>(
  ta: ReadonlyArray<HKT<F, A>>
): HKT<F, ReadonlyArray<A>> => {
  return reduce_(ta, F.of(zero()), (fas, fa) =>
    F.ap(
      F.map(fas, (as) => (a: A) => snoc(as, a)),
      fa
    )
  )
}
