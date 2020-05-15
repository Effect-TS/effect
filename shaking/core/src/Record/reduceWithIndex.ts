import { reduceWithIndex as reduceWithIndex_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export function reduceWithIndex<K extends string, A, B>(
  b: B,
  f: (k: K, b: B, a: A) => B
): (fa: Record<K, A>) => B
export function reduceWithIndex<A, B>(
  b: B,
  f: (k: string, b: B, a: A) => B
): (fa: Record<string, A>) => B {
  return reduceWithIndex_1(b, f)
}
