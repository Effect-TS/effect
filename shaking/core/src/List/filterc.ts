import type { FunctionN, Predicate } from "../Function"

import type { List } from "./common"
import { filter } from "./filter"

export function filterc<A>(f: Predicate<A>): FunctionN<[List<A>], List<A>> {
  return (list) => filter(list, f)
}
