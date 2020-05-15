import { FunctionN, flip } from "../Function"
import { pipe } from "../Pipe"

import type { List } from "./common"
import { foldl } from "./foldl"
import { reverse } from "./reverse"

export function foldr_<A, B>(list: List<A>, b: B, f: FunctionN<[A, B], B>): B {
  return pipe(list, reverse, foldl(b, flip(f)))
}
