import type { Eq } from "../Eq"

import { elem } from "./elem"
import { insert } from "./insert"
import { remove } from "./remove"

/**
 * Checks an element is a member of a set;
 * If yes, removes the value from the set
 * If no, inserts the value to the set
 *
 * @since 2.5.0
 */

export function toggle<A>(E: Eq<A>): (a: A) => (set: Set<A>) => Set<A> {
  const elemE = elem(E)
  const removeE = remove(E)
  const insertE = insert(E)
  return (a) => (set) => (elemE(a, set) ? removeE : insertE)(a)(set)
}
