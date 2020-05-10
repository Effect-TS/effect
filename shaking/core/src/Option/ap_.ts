import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"
import { none } from "./none"
import { some } from "./some"

export const ap_: <A, B>(fab: Option<(a: A) => B>, fa: Option<A>) => Option<B> = (
  mab,
  ma
) => (isNone(mab) ? none : isNone(ma) ? none : some(mab.value(ma.value)))
