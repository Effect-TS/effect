import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"
import { none } from "./none"
import { some } from "./some"

export const extend = <A, B>(f: (fa: Option<A>) => B) => (wa: Option<A>): Option<B> =>
  isNone(wa) ? none : some(f(wa))
