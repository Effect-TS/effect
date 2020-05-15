import type { FunctionN } from "../Function"

import { chain_ } from "./chain_"
import type { List } from "./common"
import { map_ } from "./map_"

export function ap<A, B>(list: List<A>, fns: List<FunctionN<[A], B>>): List<B> {
  return chain_(list, (a) => map_(fns, (f) => f(a)))
}
