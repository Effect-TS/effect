import type { Eq } from "../../Eq"
import { identity } from "../../Function"
import type { Option } from "../../Option"

import { filterMap } from "./filterMap"

/**
 * @since 2.5.0
 */

export function compact<A>(E: Eq<A>): (fa: ReadonlySet<Option<A>>) => ReadonlySet<A> {
  return filterMap(E)(identity)
}
