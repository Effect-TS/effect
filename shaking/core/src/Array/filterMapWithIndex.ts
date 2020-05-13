import type { Option } from "../Option/Option"
import { filterMapWithIndex as filterMapWithIndex_1 } from "../Readonly/Array/filterMapWithIndex"

export const filterMapWithIndex: <A, B>(
  f: (i: number, a: A) => Option<B>
) => (fa: A[]) => B[] = filterMapWithIndex_1 as any
