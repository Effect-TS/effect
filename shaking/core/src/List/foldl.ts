import type { FunctionN } from "../Function"

import { List } from "./common"
import { isCons } from "./isCons"

export function foldl<A, B>(list: List<A>, b: B, f: FunctionN<[B, A], B>): B {
  let iter = list
  let seed = b
  while (isCons(iter)) {
    seed = f(seed, iter.head)
    iter = iter.tail
  }
  return seed
}
