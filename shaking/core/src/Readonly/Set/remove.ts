import type { Eq } from "../../Eq"

import { filter } from "./filter"

/**
 * Delete a value from a set
 *
 * @since 2.5.0
 */

export function remove<A>(E: Eq<A>): (a: A) => (set: ReadonlySet<A>) => ReadonlySet<A> {
  return (a) => (set) => filter((ax: A) => !E.equals(a, ax))(set)
}
