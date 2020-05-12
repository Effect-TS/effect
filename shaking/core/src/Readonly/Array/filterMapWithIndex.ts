import type { Option } from "../../Option/Option"

import { filterMapWithIndex_ } from "./filterMapWithIndex_"

export const filterMapWithIndex: <A, B>(
  f: (i: number, a: A) => Option<B>
) => (fa: readonly A[]) => readonly B[] = (f) => (fa) => filterMapWithIndex_(fa, f)
