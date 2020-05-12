import type { Monoid } from "../../Monoid"

import { foldMapWithIndex_ } from "./foldMapWithIndex_"

export const foldMapWithIndex: <M>(
  M: Monoid<M>
) => <A>(f: (i: number, a: A) => M) => (fa: readonly A[]) => M = (M) => (f) => (fa) =>
  foldMapWithIndex_(M)(fa, f)
