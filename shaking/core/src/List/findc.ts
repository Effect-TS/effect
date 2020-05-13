import type { FunctionN, Predicate } from "../Function"
import type { Option } from "../Option/Option"

import type { List } from "./common"
import { find } from "./find"

export function findc<A>(f: Predicate<A>): FunctionN<[List<A>], Option<A>> {
  return (list) => find(list, f)
}
