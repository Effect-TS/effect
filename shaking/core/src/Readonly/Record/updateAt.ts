import { none, Option, some as optionSome } from "../../Option"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { hasOwnProperty } from "./hasOwnProperty"

/**
 * @since 2.5.0
 */
export function updateAt<A>(
  k: string,
  a: A
): <K extends string>(r: ReadonlyRecord<K, A>) => Option<ReadonlyRecord<K, A>> {
  return <K extends string>(r: ReadonlyRecord<K, A>) => {
    if (!hasOwnProperty(k, r)) {
      return none
    }
    if (r[k] === a) {
      return optionSome(r)
    }
    const out: Record<K, A> = Object.assign({}, r)
    out[k] = a
    return optionSome(out)
  }
}
