import type { Monoid } from "../Monoid/Monoid"

export const foldMap_: <M>(M: Monoid<M>) => <A>(fa: A, f: (a: A) => M) => M = (_) => (
  fa,
  f
) => f(fa)
