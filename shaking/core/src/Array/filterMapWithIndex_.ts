import type { Option } from "../Option/Option"
import { filterMapWithIndex_ as filterMapWithIndex__1 } from "../Readonly/Array/filterMapWithIndex_"

export const filterMapWithIndex_: <A, B>(
  fa: A[],
  f: (i: number, a: A) => Option<B>
) => B[] = filterMapWithIndex__1 as any
