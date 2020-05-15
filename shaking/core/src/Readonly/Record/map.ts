import { ReadonlyRecord } from "./ReadonlyRecord"
import { mapWithIndex } from "./mapWithIndex"

/**
 * Map a record passing the values to the iterating function
 *
 * @since 2.5.0
 */
export function map<A, B>(
  f: (a: A) => B
): <K extends string>(fa: ReadonlyRecord<K, A>) => ReadonlyRecord<K, B>
export function map<A, B>(
  f: (a: A) => B
): (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, B> {
  return mapWithIndex((_, a) => f(a))
}
