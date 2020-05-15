import { mapWithIndex as mapWithIndex_1 } from "../Readonly/Record"

/**
 * Map a record passing the keys to the iterating function
 *
 * @since 2.0.0
 */
export function mapWithIndex<K extends string, A, B>(
  f: (k: K, a: A) => B
): (fa: Record<K, A>) => Record<K, B>
export function mapWithIndex<A, B>(
  f: (k: string, a: A) => B
): (fa: Record<string, A>) => Record<string, B> {
  return mapWithIndex_1(f)
}
