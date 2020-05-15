import type { FunctionN, Predicate } from "../Function"

import type { List } from "./common"
import { filter_ } from "./filter_"

export function filter<A>(f: Predicate<A>): FunctionN<[List<A>], List<A>> {
  return (list) => filter_(list, f)
}
