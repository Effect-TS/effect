import type { Option } from "../../Option"

import { filterMapWithIndex_ } from "./filterMapWithIndex_"

export const filterMap_: <A, B>(
  fa: Readonly<Record<string, A>>,
  f: (a: A) => Option<B>
) => Readonly<Record<string, B>> = (fa, f) => filterMapWithIndex_(fa, (_, a) => f(a))
