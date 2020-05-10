import type { Option } from "fp-ts/lib/Option"

import type { Predicate, Refinement } from "../Function"

import { isNone } from "./isNone"
import { none } from "./none"

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (fa: Option<A>) => Option<B>
  <A>(predicate: Predicate<A>): (fa: Option<A>) => Option<A>
} = <A>(predicate: Predicate<A>) => (fa: Option<A>): Option<A> =>
  isNone(fa) ? none : predicate(fa.value) ? fa : none
