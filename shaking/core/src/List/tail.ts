import type { Option } from "../Option/Option"
import { none } from "../Option/none"
import { some } from "../Option/some"

import { cata_ } from "./cata_"
import { List } from "./common"

export function tail<A>(list: List<A>): Option<List<A>> {
  return cata_(
    list,
    (_, rest) => some(rest),
    () => none
  )
}
