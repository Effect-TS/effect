import type { Monoid } from "../Monoid"

import type { Tree } from "./Tree"
import { foldMap_ } from "./foldMap_"

export const foldMap: <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Tree<A>) => M = (
  M
) => (f) => (fa) => foldMap_(M)(fa, f)
