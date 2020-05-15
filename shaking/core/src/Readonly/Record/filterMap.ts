import type { Option } from "../../Option"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { filterMap_ } from "./filterMap_"

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, B> = (f) => (fa) =>
  filterMap_(fa, f)
