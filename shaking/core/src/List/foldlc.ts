import type { FunctionN } from "../Function"

import type { List } from "./common"
import { foldl } from "./foldl"

export function foldlc<A, B>(b: B, f: FunctionN<[B, A], B>): FunctionN<[List<A>], B> {
  return (list) => foldl(list, b, f)
}
