import type { FunctionN } from "../Function"
import { pipe } from "../Pipe"

import { List } from "./common"
import { concat } from "./concat"
import { foldlc } from "./foldlc"
import { lift } from "./lift"
import { nil } from "./nil"

export function chain<A, B>(list: List<A>, f: FunctionN<[A], List<B>>): List<B> {
  return pipe(list, lift(f), foldlc(nil as List<B>, concat))
}
