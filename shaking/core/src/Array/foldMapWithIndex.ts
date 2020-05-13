import type { Monoid } from "../Monoid"
import { foldMapWithIndex as foldMapWithIndex_1 } from "../Readonly/Array/foldMapWithIndex"

export const foldMapWithIndex: <M>(
  M: Monoid<M>
) => <A>(f: (i: number, a: A) => M) => (fa: A[]) => M = foldMapWithIndex_1 as any
