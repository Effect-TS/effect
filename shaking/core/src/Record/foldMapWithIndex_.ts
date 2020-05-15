import type { Monoid } from "../Monoid"
import { foldMapWithIndex_ as foldMapWithIndex__1 } from "../Readonly/Record"

export const foldMapWithIndex_: <M>(
  M: Monoid<M>
) => <A>(fa: Record<string, A>, f: (i: string, a: A) => M) => M = foldMapWithIndex__1
