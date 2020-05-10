import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"

export const alt_: <A>(fx: Option<A>, fy: () => Option<A>) => Option<A> = (ma, f) =>
  isNone(ma) ? f() : ma
