import type { Option } from "../../Option"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { filterMapWithIndex_ } from "./filterMapWithIndex_"

/**
 * @since 2.5.0
 */
export function filterMapWithIndex<K extends string, A, B>(
  f: (key: K, a: A) => Option<B>
): (fa: ReadonlyRecord<K, A>) => ReadonlyRecord<string, B>
export function filterMapWithIndex<A, B>(
  f: (key: string, a: A) => Option<B>
): (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, B> {
  return (fa) => filterMapWithIndex_(fa, f)
}
