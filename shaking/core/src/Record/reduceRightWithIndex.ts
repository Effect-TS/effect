import { reduceRightWithIndex as reduceRightWithIndex_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export function reduceRightWithIndex<K extends string, A, B>(
  b: B,
  f: (k: K, a: A, b: B) => B
): (fa: Record<K, A>) => B
export function reduceRightWithIndex<A, B>(
  b: B,
  f: (k: string, a: A, b: B) => B
): (fa: Record<string, A>) => B {
  return reduceRightWithIndex_1(b, f)
}
