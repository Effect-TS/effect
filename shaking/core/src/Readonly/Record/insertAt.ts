import type { ReadonlyRecord } from "./ReadonlyRecord"

/**
 * Insert or replace a key/value pair in a record
 *
 * @since 2.5.0
 */
export function insertAt<K extends string, A>(
  k: K,
  a: A
): <KS extends string>(r: ReadonlyRecord<KS, A>) => ReadonlyRecord<KS | K, A>
export function insertAt<A>(
  k: string,
  a: A
): (r: ReadonlyRecord<string, A>) => ReadonlyRecord<string, A> {
  return (r) => {
    if (r[k] === a) {
      return r
    }
    const out: Record<string, A> = Object.assign({}, r)
    out[k] = a
    return out
  }
}
