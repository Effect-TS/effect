import type { Predicate } from "../Function"

import type { List } from "./common"
import { cons } from "./cons"
import { foldr } from "./foldr"
import { nil } from "./nil"

export function filter<A>(list: List<A>, f: Predicate<A>): List<A> {
  return foldr(list, nil as List<A>, (a, t) => (f(a) ? cons(a, t) : t))
}
