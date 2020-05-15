import type { ReadonlyRecord } from "./ReadonlyRecord"
import { reduceRightWithIndex_ } from "./reduceRightWithIndex_"

/**
 * @since 2.5.0
 */
export function reduceRightWithIndex<K extends string, A, B>(
  b: B,
  f: (k: K, a: A, b: B) => B
): (fa: ReadonlyRecord<K, A>) => B
export function reduceRightWithIndex<A, B>(
  b: B,
  f: (k: string, a: A, b: B) => B
): (fa: ReadonlyRecord<string, A>) => B {
  return (fa) => reduceRightWithIndex_(fa, b, f)
}
