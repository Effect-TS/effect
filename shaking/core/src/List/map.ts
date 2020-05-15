import { FunctionN } from "../Function"
import { pipe } from "../Pipe"

import { List } from "./common"
import { cons } from "./cons"
import { foldl } from "./foldl"
import { nil } from "./nil"
import { reverse } from "./reverse"

export function map<A, B>(f: FunctionN<[A], B>): (list: List<A>) => List<B> {
  return (list) =>
    pipe(
      list,
      foldl(nil as List<B>, (t, a) => cons(f(a), t)),
      reverse
    )
}
