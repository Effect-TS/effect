import { isNone, none, Option, some as optionSome } from "../../Option"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { deleteAt } from "./deleteAt"
import { lookup } from "./lookup"

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 *
 * @since 2.5.0
 */
export function pop<K extends string>(
  k: K
): <KS extends string, A>(
  r: ReadonlyRecord<KS, A>
) => Option<readonly [A, ReadonlyRecord<string extends K ? string : Exclude<KS, K>, A>]>
export function pop(
  k: string
): <A>(
  r: ReadonlyRecord<string, A>
) => Option<readonly [A, ReadonlyRecord<string, A>]> {
  const deleteAtk = deleteAt(k)
  return (r) => {
    const oa = lookup(k, r)
    return isNone(oa) ? none : optionSome([oa.value, deleteAtk(r)])
  }
}
