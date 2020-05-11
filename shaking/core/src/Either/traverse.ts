import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Traverse2 } from "fp-ts/lib/Traversable"

import type { Either } from "./Either"
import type { URI } from "./URI"
import { isLeft } from "./isLeft"
import { left } from "./left"
import { right } from "./right"

export const traverse: Traverse2<URI> = <F>(F: Applicative<F>) => <E, A, B>(
  ma: Either<E, A>,
  f: (a: A) => HKT<F, B>
): HKT<F, Either<E, B>> => {
  return isLeft(ma) ? F.of(left(ma.left)) : F.map<B, Either<E, B>>(f(ma.right), right)
}
