import type { Option } from "../Option/Option"
import { filterMap_ as filterMap__1 } from "../Readonly/Record"

export const filterMap_: <A, B>(
  fa: Record<string, A>,
  f: (a: A) => Option<B>
) => Record<string, B> = filterMap__1
