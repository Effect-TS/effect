import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"
import { none } from "./none"
import { some } from "./some"

export const extend_: <A, B>(wa: Option<A>, f: (wa: Option<A>) => B) => Option<B> = (
  wa,
  f
) => (isNone(wa) ? none : some(f(wa)))
