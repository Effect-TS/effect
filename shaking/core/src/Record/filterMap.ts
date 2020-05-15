import type { Option } from "../Option/Option"
import { filterMap as filterMap_1 } from "../Readonly/Record"

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => (fa: Record<string, A>) => Record<string, B> = filterMap_1
