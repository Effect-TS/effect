import type { Predicate } from "../Function"
import { Option } from "../Option/Option"
import { none } from "../Option/none"
import { some } from "../Option/some"

import { List } from "./common"
import { isCons } from "./isCons"

export function find<A>(list: List<A>, f: Predicate<A>): Option<A> {
  let iter = list
  while (isCons(iter)) {
    if (f(iter.head)) {
      return some(iter.head)
    }
    iter = iter.tail
  }
  return none
}
