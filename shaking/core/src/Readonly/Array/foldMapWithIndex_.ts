import type { Monoid } from "../../Monoid"

export const foldMapWithIndex_ = <M>(M: Monoid<M>) => <A>(
  fa: readonly A[],
  f: (i: number, a: A) => M
): M => fa.reduce((b, a, i) => M.concat(b, f(i, a)), M.empty)
