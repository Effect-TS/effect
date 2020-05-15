import type { FunctionN, Lazy } from "../Function"

import type { List } from "./common"
import { isCons } from "./isCons"

export function cata_<A, B>(
  list: List<A>,
  ifCons: FunctionN<[A, List<A>], B>,
  ifNil: Lazy<B>
): B {
  if (isCons(list)) {
    return ifCons(list.head, list.tail)
  }
  return ifNil()
}
