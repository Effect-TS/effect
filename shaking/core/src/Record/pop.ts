import type { Option } from "../Option/Option"
import { pop as pop_1 } from "../Readonly/Record"

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 *
 * @since 2.0.0
 */
export function pop<K extends string>(
  k: K
): <KS extends string, A>(
  r: Record<KS, A>
) => Option<[A, Record<string extends K ? string : Exclude<KS, K>, A>]>
export function pop(
  k: string
): <A>(r: Record<string, A>) => Option<[A, Record<string, A>]> {
  return pop_1(k) as any
}
