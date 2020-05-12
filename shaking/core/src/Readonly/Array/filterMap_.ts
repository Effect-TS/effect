import type { Option } from "../../Option/Option"

import { filterMapWithIndex_ } from "./filterMapWithIndex_"

export const filterMap_: <A, B>(
  fa: readonly A[],
  f: (a: A) => Option<B>
) => readonly B[] = (as, f) => filterMapWithIndex_(as, (_, a) => f(a))
