import type { Monoid } from "../../Monoid"

import { foldMapWithIndex_ } from "./foldMapWithIndex_"

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: readonly A[], f: (a: A) => M) => M = (M) => {
  const foldMapWithIndexM = foldMapWithIndex_(M)
  return (fa, f) => foldMapWithIndexM(fa, (_, a) => f(a))
}
