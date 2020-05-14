import type { Option } from "../Option"
import * as RM from "../Readonly/Map/filterMap"

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => <E>(fa: Map<E, A>) => Map<E, B> = RM.filterMap as any
