import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"
import { none } from "./none"

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => (fa: Option<A>) => Option<B> = (f) => (ma) => (isNone(ma) ? none : f(ma.value))
