import type { ReadonlyRecord } from "./ReadonlyRecord"
import { reduceWithIndex_ } from "./reduceWithIndex_"

/**
 * @since 2.5.0
 */
export function reduceWithIndex<K extends string, A, B>(
  b: B,
  f: (k: K, b: B, a: A) => B
): (fa: ReadonlyRecord<K, A>) => B
export function reduceWithIndex<A, B>(
  b: B,
  f: (k: string, b: B, a: A) => B
): (fa: ReadonlyRecord<string, A>) => B {
  return (fa) => reduceWithIndex_(fa, b, f)
}
