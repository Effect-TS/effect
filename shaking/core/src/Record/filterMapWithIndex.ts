import type { Option } from "../Option/Option"
import { filterMapWithIndex as filterMapWithIndex_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export function filterMapWithIndex<K extends string, A, B>(
  f: (key: K, a: A) => Option<B>
): (fa: Record<K, A>) => Record<string, B>
export function filterMapWithIndex<A, B>(
  f: (key: string, a: A) => Option<B>
): (fa: Record<string, A>) => Record<string, B> {
  return filterMapWithIndex_1(f)
}
