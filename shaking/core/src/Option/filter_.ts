import type { Option } from "fp-ts/lib/Option"

import type { Predicate } from "../Function"

import { isNone } from "./isNone"
import { none } from "./none"

export const filter_ = <A>(fa: Option<A>, predicate: Predicate<A>): Option<A> => {
  return isNone(fa) ? none : predicate(fa.value) ? fa : none
}
