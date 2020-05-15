import { none, Option, some as optionSome } from "../../Option"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { _hasOwnProperty } from "./_hasOwnProperty"

/**
 * Lookup the value for a key in a record
 *
 * @since 2.5.0
 */
export function lookup<A>(k: string, r: ReadonlyRecord<string, A>): Option<A> {
  return _hasOwnProperty.call(r, k) ? optionSome(r[k]) : none
}
