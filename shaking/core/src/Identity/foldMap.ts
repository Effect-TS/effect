import type { Monoid } from "../Monoid/Monoid"

import { foldMap_ } from "./foldMap_"

export const foldMap: <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: A) => M = (
  M
) => (f) => (fa) => foldMap_(M)(fa, f)
