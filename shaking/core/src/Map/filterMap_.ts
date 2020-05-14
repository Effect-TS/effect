import type { Option } from "../Option"
import * as RM from "../Readonly/Map/filterMap_"

export const filterMap_: <E, A, B>(
  fa: Map<E, A>,
  f: (a: A) => Option<B>
) => Map<E, B> = RM.filterMap_ as any
