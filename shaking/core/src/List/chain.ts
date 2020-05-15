import { FunctionN } from "../Function"
import { pipe } from "../Pipe"

import { List } from "./common"
import { concat } from "./concat"
import { foldl } from "./foldl"
import { lift } from "./lift"
import { nil } from "./nil"

export function chain<A, B>(f: FunctionN<[A], List<B>>): (list: List<A>) => List<B> {
  return (list) => pipe(list, lift(f), foldl(nil as List<B>, concat))
}
