import type { Option } from "../Option/Option"
import { none } from "../Option/none"
import { some } from "../Option/some"

import { cata } from "./cata"
import { List } from "./common"

export function head<A>(list: List<A>): Option<A> {
  return cata(list, some, () => none)
}
