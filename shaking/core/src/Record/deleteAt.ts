import { deleteAt as deleteAt_1 } from "../Readonly/Record"

/**
 * Delete a key and value from a map
 *
 * @since 2.0.0
 */
export function deleteAt<K extends string>(
  k: K
): <KS extends string, A>(
  r: Record<KS, A>
) => Record<string extends K ? string : Exclude<KS, K>, A>
export function deleteAt(k: string): <A>(r: Record<string, A>) => Record<string, A> {
  return deleteAt_1(k) as any
}
