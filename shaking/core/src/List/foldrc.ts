import type { FunctionN } from "../Function"

import type { List } from "./common"
import { foldr } from "./foldr"

export function foldrc<A, B>(b: B, f: FunctionN<[A, B], B>): FunctionN<[List<A>], B> {
  return (list) => foldr(list, b, f)
}
