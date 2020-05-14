import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either"
import type { Eq } from "../../Eq"

import { elem } from "./elem"

/**
 * @since 2.5.0
 */

export function separate<E, A>(
  EE: Eq<E>,
  EA: Eq<A>
): (fa: ReadonlySet<Either<E, A>>) => Separated<ReadonlySet<E>, ReadonlySet<A>> {
  return (fa) => {
    const elemEE = elem(EE)
    const elemEA = elem(EA)
    const left: Set<E> = new Set()
    const right: Set<A> = new Set()
    fa.forEach((e) => {
      switch (e._tag) {
        case "Left":
          if (!elemEE(e.left, left)) {
            left.add(e.left)
          }
          break
        case "Right":
          if (!elemEA(e.right, right)) {
            right.add(e.right)
          }
          break
      }
    })
    return { left, right }
  }
}
