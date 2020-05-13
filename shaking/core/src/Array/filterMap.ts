import type { Option } from "../Option/Option"
import { filterMap as filterMap_1 } from "../Readonly/Array/filterMap"

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => (fa: A[]) => B[] = filterMap_1 as any
