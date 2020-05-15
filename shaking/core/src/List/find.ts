import type { FunctionN, Predicate } from "../Function"
import type { Option } from "../Option/Option"

import type { List } from "./common"
import { find_ } from "./find_"

export function find<A>(f: Predicate<A>): FunctionN<[List<A>], Option<A>> {
  return (list) => find_(list, f)
}
