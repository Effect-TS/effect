import type { Option } from "../../Option/Option"

import { filterMap_ } from "./filterMap_"

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => (fa: readonly A[]) => readonly B[] = (f) => (fa) => filterMap_(fa, f)
