import type { Monoid } from "../Monoid"

import type { Tree } from "./Tree"
import { reduce_ } from "./reduce_"

export const foldMap_: <M>(M: Monoid<M>) => <A>(fa: Tree<A>, f: (a: A) => M) => M = (
  M
) => (fa, f) => reduce_(fa, M.empty, (acc, a) => M.concat(acc, f(a)))
