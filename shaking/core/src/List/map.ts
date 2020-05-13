import type { FunctionN } from "../Function"
import { pipe } from "../Pipe"

import type { List } from "./common"
import { cons } from "./cons"
import { foldlc } from "./foldlc"
import { nil } from "./nil"
import { reverse } from "./reverse"

export function map<A, B>(list: List<A>, f: FunctionN<[A], B>): List<B> {
  return pipe(
    list,
    foldlc(nil as List<B>, (t, a) => cons(f(a), t)),
    reverse
  )
}
