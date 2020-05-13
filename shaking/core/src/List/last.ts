import type { Option } from "../Option/Option"
import { none } from "../Option/none"
import { some } from "../Option/some"

import { List } from "./common"
import { isCons } from "./isCons"
import { isNil } from "./isNil"

export function last<A>(list: List<A>): Option<A> {
  if (isNil(list)) {
    return none
  }
  let iter = list
  while (isCons(iter.tail)) {
    iter = iter.tail
  }
  return some(iter.head)
}
