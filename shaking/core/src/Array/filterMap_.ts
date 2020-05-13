import type { Option } from "../Option/Option"
import { filterMap_ as filterMap__1 } from "../Readonly/Array/filterMap_"

export const filterMap_: <A, B>(
  fa: A[],
  f: (a: A) => Option<B>
) => B[] = filterMap__1 as any
