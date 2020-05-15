import type { Monoid } from "../Monoid"
import { foldMapWithIndex as foldMapWithIndex_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export function foldMapWithIndex<M>(
  M: Monoid<M>
): <K extends string, A>(f: (k: K, a: A) => M) => (fa: Record<K, A>) => M
export function foldMapWithIndex<M>(
  M: Monoid<M>
): <A>(f: (k: string, a: A) => M) => (fa: Record<string, A>) => M {
  return foldMapWithIndex_1(M)
}
