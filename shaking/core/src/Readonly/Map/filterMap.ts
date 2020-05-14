import type { Option } from "../../Option"

import { filterMap_ } from "./filterMap_"

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => <E>(fa: ReadonlyMap<E, A>) => ReadonlyMap<E, B> = (f) => (fa) => filterMap_(fa, f)
