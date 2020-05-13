import type { Monoid } from "../Monoid"
import { foldMapWithIndex_ as foldMapWithIndex__1 } from "../Readonly/Array/foldMapWithIndex_"

export const foldMapWithIndex_: <M>(
  M: Monoid<M>
) => <A>(fa: A[], f: (i: number, a: A) => M) => M = foldMapWithIndex__1 as any
