import type { Chunk } from "../definition"

/**
 * joins the elements together with "sep" in the middle.
 *
 * @tsplus fluent ets/Chunk join
 */
export function join_(self: Chunk<string>, sep: string): string {
  return self.reduce("", (s, a) => (s.length > 0 ? `${s}${sep}${a}` : a))
}

/**
 * joins the elements together with "sep" in the middle.
 *
 * @ets_data_first join_
 */
export function join(sep: string) {
  return (self: Chunk<string>): string => self.join(sep)
}
