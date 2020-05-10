import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"
import { none } from "./none"

export const filterMap_: <A, B>(fa: Option<A>, f: (a: A) => Option<B>) => Option<B> = (
  ma,
  f
) => (isNone(ma) ? none : f(ma.value))
