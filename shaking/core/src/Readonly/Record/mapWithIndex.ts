import type { ReadonlyRecord } from "./ReadonlyRecord"
import { mapWithIndex_ } from "./mapWithIndex_"

/**
 * Map a record passing the keys to the iterating function
 *
 * @since 2.5.0
 */
export function mapWithIndex<K extends string, A, B>(
  f: (k: K, a: A) => B
): (fa: ReadonlyRecord<K, A>) => ReadonlyRecord<K, B>
export function mapWithIndex<A, B>(
  f: (k: string, a: A) => B
): (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, B> {
  return (fa) => mapWithIndex_(fa, f)
}
