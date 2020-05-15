import { insertAt as insertAt_1 } from "../Readonly/Record"

/**
 * Insert or replace a key/value pair in a record
 *
 * @since 2.0.0
 */
export function insertAt<K extends string, A>(
  k: K,
  a: A
): <KS extends string>(r: Record<KS, A>) => Record<KS | K, A>
export function insertAt<A>(
  k: string,
  a: A
): (r: Record<string, A>) => Record<string, A> {
  return insertAt_1(k, a) as any
}
