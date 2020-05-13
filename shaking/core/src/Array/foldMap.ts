import type { Monoid } from "../Monoid"
import { foldMap as foldMap_1 } from "../Readonly/Array/foldMap"

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: A[]) => M = foldMap_1 as any
