import type { FunctionN } from "../Function"

import type { List } from "./common"
import { map_ } from "./map_"

export function lift<A, B>(f: FunctionN<[A], B>): FunctionN<[List<A>], List<B>> {
  return (list) => map_(list, f)
}
