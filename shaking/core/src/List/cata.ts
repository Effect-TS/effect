import type { FunctionN, Lazy } from "../Function"

import { cata_ } from "./cata_"
import type { List } from "./common"

export function cata<A, B>(
  ifCons: FunctionN<[A, List<A>], B>,
  ifNil: Lazy<B>
): FunctionN<[List<A>], B> {
  return (list) => cata_(list, ifCons, ifNil)
}
