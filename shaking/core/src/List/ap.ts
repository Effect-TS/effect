import type { FunctionN } from "../Function"

import { chain } from "./chain"
import type { List } from "./common"
import { map } from "./map"

export function ap<A, B>(list: List<A>, fns: List<FunctionN<[A], B>>): List<B> {
  return chain(list, (a) => map(fns, (f) => f(a)))
}
