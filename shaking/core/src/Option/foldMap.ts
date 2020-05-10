import type { Monoid } from "fp-ts/lib/Monoid"
import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: Option<A>) => M = (M) => (f) => (fa) =>
  isNone(fa) ? M.empty : f(fa.value)
