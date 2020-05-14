import type { Option } from "../../Option"

import { filterMapWithIndex_ } from "./filterMapWithIndex_"

export const filterMap_: <E, A, B>(
  fa: ReadonlyMap<E, A>,
  f: (a: A) => Option<B>
) => ReadonlyMap<E, B> = (fa, f) => filterMapWithIndex_(fa, (_, a) => f(a))
