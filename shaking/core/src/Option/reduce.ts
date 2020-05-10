import type { Option } from "fp-ts/lib/Option"

import { reduce_ } from "./reduce_"

export const reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Option<A>) => B = (
  b,
  f
) => (fa) => reduce_(fa, b, f)
