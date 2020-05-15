import { none, Option, some as optionSome } from "../../Option"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { hasOwnProperty } from "./hasOwnProperty"

/**
 * @since 2.5.0
 */
export function modifyAt<A>(
  k: string,
  f: (a: A) => A
): <K extends string>(r: ReadonlyRecord<K, A>) => Option<ReadonlyRecord<K, A>> {
  return <K extends string>(r: ReadonlyRecord<K, A>) => {
    if (!hasOwnProperty(k, r)) {
      return none
    }
    const out: Record<K, A> = Object.assign({}, r)
    out[k] = f(r[k])
    return optionSome(out)
  }
}
