import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either"
import type { Eq } from "../../Eq"

import type { Next } from "./Next"
import { elem } from "./elem"

/**
 * @since 2.5.0
 */

export function partitionMap<B, C>(
  EB: Eq<B>,
  EC: Eq<C>
): <A>(
  f: (a: A) => Either<B, C>
) => (set: ReadonlySet<A>) => Separated<ReadonlySet<B>, ReadonlySet<C>> {
  return <A>(f: (a: A) => Either<B, C>) => (set: ReadonlySet<A>) => {
    const values = set.values()
    let e: Next<A>
    const left = new Set<B>()
    const right = new Set<C>()
    const hasB = elem(EB)
    const hasC = elem(EC)
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = values.next()).done) {
      const v = f(e.value)
      switch (v._tag) {
        case "Left":
          if (!hasB(v.left, left)) {
            left.add(v.left)
          }
          break
        case "Right":
          if (!hasC(v.right, right)) {
            right.add(v.right)
          }
          break
      }
    }
    return { left, right }
  }
}
