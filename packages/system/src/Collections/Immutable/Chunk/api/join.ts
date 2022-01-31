// ets_tracing: off

import type { Chunk } from "../definition.js"
import { reduce_ } from "./reduce.js"

/**
 * joins the elements together with "sep" in the middle
 */
export function join_(self: Chunk<string>, sep: string) {
  return reduce_(self, "", (s, a) => (s.length > 0 ? `${s}${sep}${a}` : a))
}

/**
 * joins the elements together with "sep" in the middle
 *
 * @ets_data_first join_
 */
export function join(sep: string) {
  return (self: Chunk<string>) => join_(self, sep)
}
