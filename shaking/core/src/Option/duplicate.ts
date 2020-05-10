import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"
import { none } from "./none"
import { some } from "./some"

export const duplicate: <A>(ma: Option<A>) => Option<Option<A>> = (ma) =>
  isNone(ma) ? none : some(ma)
