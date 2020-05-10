import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"

export const reduceRight_: <A, B>(fa: Option<A>, b: B, f: (a: A, b: B) => B) => B = (
  fa,
  b,
  f
) => (isNone(fa) ? b : f(fa.value, b))
