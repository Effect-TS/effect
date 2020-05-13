import type { FunctionN, Lazy } from "../Function"

import { cata } from "./cata"
import type { List } from "./common"

export function catac<A, B>(
  ifCons: FunctionN<[A, List<A>], B>,
  ifNil: Lazy<B>
): FunctionN<[List<A>], B> {
  return (list) => cata(list, ifCons, ifNil)
}
