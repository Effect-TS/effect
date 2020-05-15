import type { FunctionN } from "../Function"
import { pipe } from "../Pipe"

import type { List } from "./common"
import { cons } from "./cons"
import { foldl } from "./foldl"
import { nil } from "./nil"
import { reverse } from "./reverse"

export function map_<A, B>(list: List<A>, f: FunctionN<[A], B>): List<B> {
  return pipe(
    list,
    foldl(nil as List<B>, (t, a) => cons(f(a), t)),
    reverse
  )
}
