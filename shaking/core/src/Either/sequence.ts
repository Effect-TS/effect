import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Sequence2 } from "fp-ts/lib/Traversable"

import type { Either } from "./Either"
import type { URI } from "./URI"
import { isLeft } from "./isLeft"
import { left } from "./left"
import { right } from "./right"

export const sequence: Sequence2<URI> = <F>(F: Applicative<F>) => <E, A>(
  ma: Either<E, HKT<F, A>>
): HKT<F, Either<E, A>> => {
  return isLeft(ma) ? F.of(left(ma.left)) : F.map<A, Either<E, A>>(ma.right, right)
}
