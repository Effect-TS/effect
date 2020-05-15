import type { Eq } from "../Eq"
import { getEq as getEq_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export function getEq<K extends string, A>(E: Eq<A>): Eq<Record<K, A>>
export function getEq<A>(E: Eq<A>): Eq<Record<string, A>> {
  return getEq_1(E)
}
