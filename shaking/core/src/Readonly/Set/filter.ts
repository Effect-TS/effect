import type { Predicate, Refinement } from "../../Function"

import type { Next } from "./Next"

/**
 * @since 2.5.0
 */

export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (set: ReadonlySet<A>) => ReadonlySet<B>
export function filter<A>(
  predicate: Predicate<A>
): (set: ReadonlySet<A>) => ReadonlySet<A>
export function filter<A>(
  predicate: Predicate<A>
): (set: ReadonlySet<A>) => ReadonlySet<A> {
  return (set) => {
    const values = set.values()
    let e: Next<A>
    const r = new Set<A>()
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = values.next()).done) {
      const value = e.value
      if (predicate(value)) {
        r.add(value)
      }
    }
    return r
  }
}
