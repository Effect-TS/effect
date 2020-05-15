import type { Predicate } from "../Function"

import type { List } from "./common"
import { cons } from "./cons"
import { foldr_ } from "./foldr_"
import { nil } from "./nil"

export function filter_<A>(list: List<A>, f: Predicate<A>): List<A> {
  return foldr_(list, nil as List<A>, (a, t) => (f(a) ? cons(a, t) : t))
}
