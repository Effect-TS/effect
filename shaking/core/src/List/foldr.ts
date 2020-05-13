import { FunctionN, flip } from "../Function"
import { pipe } from "../Pipe"

import type { List } from "./common"
import { foldlc } from "./foldlc"
import { reverse } from "./reverse"

export function foldr<A, B>(list: List<A>, b: B, f: FunctionN<[A, B], B>): B {
  return pipe(list, reverse, foldlc(b, flip(f)))
}
