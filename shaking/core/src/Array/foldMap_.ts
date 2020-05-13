import type { Monoid } from "../Monoid"
import { foldMap_ as foldMap__1 } from "../Readonly/Array/foldMap_"

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: A[], f: (a: A) => M) => M = foldMap__1 as any
