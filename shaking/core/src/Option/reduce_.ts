import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"

export const reduce_: <A, B>(fa: Option<A>, b: B, f: (b: B, a: A) => B) => B = (
  fa,
  b,
  f
) => (isNone(fa) ? b : f(b, fa.value))
