import type { Option } from "fp-ts/lib/Option"

import { reduce_ } from "./reduce_"

export const reduceRight: <A, B>(b: B, f: (a: A, b: B) => B) => (fa: Option<A>) => B = (
  b,
  f
) => (fa) => reduce_(fa, b, (b_, a_) => f(a_, b_))
