import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * @tsplus static effect/core/testing/Gen.Ops listOf1
 * @tsplus getter effect/core/testing/Gen listOf1
 * @category mutations
 * @since 1.0.0
 */
export function listOf1<R, A>(self: Gen<R, A>): Gen<R | Sized, List.Cons<A>> {
  return Do(($) => {
    const head = $(self)
    const tail = $(Gen.small((n) => self.listOfN(Math.max(0, n - 1))))
    return pipe(tail, List.prepend(head))
  })
}
