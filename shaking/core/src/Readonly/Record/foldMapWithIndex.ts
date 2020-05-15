import type { Monoid } from "../../Monoid"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { foldMapWithIndex_ } from "./foldMapWithIndex_"

/**
 * @since 2.5.0
 */
export function foldMapWithIndex<M>(
  M: Monoid<M>
): <K extends string, A>(f: (k: K, a: A) => M) => (fa: ReadonlyRecord<K, A>) => M
export function foldMapWithIndex<M>(
  M: Monoid<M>
): <A>(f: (k: string, a: A) => M) => (fa: ReadonlyRecord<string, A>) => M {
  const foldMapWithIndexM = foldMapWithIndex_(M)
  return (f) => (fa) => foldMapWithIndexM(fa, f)
}
