import { Monoid } from "../Monoid"
import { foldMap_ as foldMap__1 } from "../Readonly/Record"

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: Record<string, A>, f: (a: A) => M) => M = foldMap__1
