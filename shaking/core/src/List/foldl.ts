import type { FunctionN } from "../Function"

import type { List } from "./common"
import { foldl_ } from "./foldl_"

export function foldl<A, B>(b: B, f: FunctionN<[B, A], B>): FunctionN<[List<A>], B> {
  return (list) => foldl_(list, b, f)
}
