import type { Monoid } from "fp-ts/lib/Monoid"
import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"

export const foldMap_: <M>(M: Monoid<M>) => <A>(fa: Option<A>, f: (a: A) => M) => M = (
  M
) => (fa, f) => (isNone(fa) ? M.empty : f(fa.value))
