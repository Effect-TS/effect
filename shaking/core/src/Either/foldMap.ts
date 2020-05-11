import type { Monoid } from "../Monoid"

import type { Either } from "./Either"
import { isLeft } from "./isLeft"

export const foldMap_: <M>(
  M: Monoid<M>
) => <E, A>(fa: Either<E, A>, f: (a: A) => M) => M = (M) => (fa, f) =>
  isLeft(fa) ? M.empty : f(fa.right)

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => <E>(fa: Either<E, A>) => M = (M) => (f) => (fa) =>
  foldMap_(M)(fa, f)
