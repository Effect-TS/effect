import type { Monoid } from "../../Monoid"

import { foldMap_ } from "./foldMap_"

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: Readonly<Record<string, A>>) => M = (M) => (f) => (
  fa
) => foldMap_(M)(fa, f)
