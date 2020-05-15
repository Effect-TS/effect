import type { ReadonlyRecord } from "./ReadonlyRecord"
import { _hasOwnProperty } from "./_hasOwnProperty"

/**
 * Delete a key and value from a map
 *
 * @since 2.5.0
 */
export function deleteAt<K extends string>(
  k: K
): <KS extends string, A>(
  r: ReadonlyRecord<KS, A>
) => ReadonlyRecord<string extends K ? string : Exclude<KS, K>, A>
export function deleteAt(
  k: string
): <A>(r: ReadonlyRecord<string, A>) => ReadonlyRecord<string, A> {
  return <A>(r: ReadonlyRecord<string, A>) => {
    if (!_hasOwnProperty.call(r, k)) {
      return r
    }
    const out: Record<string, A> = Object.assign({}, r)
    delete out[k]
    return out
  }
}
