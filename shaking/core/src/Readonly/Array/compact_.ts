import { identity } from "../../Function"
import type { Option } from "../../Option/Option"

import { filterMap_ } from "./filterMap_"

export const compact_: <A>(fa: readonly Option<A>[]) => readonly A[] = (as) =>
  filterMap_(as, identity)
