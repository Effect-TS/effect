import type { Monoid } from "../Monoid"
import { foldMap as foldMap_1 } from "../Readonly/Record"

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: Record<string, A>) => M = foldMap_1
