import type { Option } from "../Option/Option"
import { none } from "../Option/none"
import { some } from "../Option/some"

import { cata_ } from "./cata_"
import { List } from "./common"

export function head<A>(list: List<A>): Option<A> {
  return cata_(list, some, () => none)
}
