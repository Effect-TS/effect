import { map as map_1 } from "../Readonly/Record"

/**
 * Map a record passing the values to the iterating function
 *
 * @since 2.0.0
 */
export function map<A, B>(
  f: (a: A) => B
): <K extends string>(fa: Record<K, A>) => Record<K, B>
export function map<A, B>(
  f: (a: A) => B
): (fa: Record<string, A>) => Record<string, B> {
  return map_1(f)
}
