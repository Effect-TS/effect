import type { Monoid } from "../../Monoid"

import { foldMap_ } from "./foldMap_"

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: readonly A[]) => M = (M) => (f) => (fa) =>
  foldMap_(M)(fa, f)
