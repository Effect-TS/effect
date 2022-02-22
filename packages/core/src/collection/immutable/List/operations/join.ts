import type { List } from "../definition"

/**
 * Concats the strings in the list separated by a specified separator.
 *
 * @tsplus fluent ets/List join
 */
export function join_(self: List<string>, separator: string): string {
  return self.reduce("", (a, b) => (a.length === 0 ? b : a + separator + b))
}

/**
 * Concats the strings in the list separated by a specified separator.
 *
 * @ets_data_first join_
 */
export function join(separator: string) {
  return (self: List<string>): string => self.join(separator)
}
