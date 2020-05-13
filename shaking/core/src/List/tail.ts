import type { Option } from "../Option/Option"
import { none } from "../Option/none"
import { some } from "../Option/some"

import { cata } from "./cata"
import { List } from "./common"

export function tail<A>(list: List<A>): Option<List<A>> {
  return cata(
    list,
    (_, rest) => some(rest),
    () => none
  )
}
