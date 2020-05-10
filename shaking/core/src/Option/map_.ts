import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"
import { none } from "./none"
import { some } from "./some"

export const map_: <A, B>(fa: Option<A>, f: (a: A) => B) => Option<B> = (ma, f) =>
  isNone(ma) ? none : some(f(ma.value))
