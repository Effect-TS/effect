import type { FunctionN } from "../Function"

import type { List } from "./common"
import { foldr_ } from "./foldr_"

export function foldr<A, B>(b: B, f: FunctionN<[A, B], B>): FunctionN<[List<A>], B> {
  return (list) => foldr_(list, b, f)
}
