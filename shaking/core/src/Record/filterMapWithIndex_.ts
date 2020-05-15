import type { Option } from "../Option/Option"
import { filterMapWithIndex_ as filterMapWithIndex__1 } from "../Readonly/Record"

export const filterMapWithIndex_: <A, B>(
  fa: Record<string, A>,
  f: (i: string, a: A) => Option<B>
) => Record<string, B> = filterMapWithIndex__1
