/**
 * @tsplus static effect/core/testing/Gen.Ops listOf1
 * @tsplus getter effect/core/testing/Gen listOf1
 */
export function listOf1<R, A>(self: Gen<R, A>): Gen<R | Sized, List.NonEmpty<A>> {
  return Do(($) => {
    const head = $(self)
    const tail = $(Gen.small((n) => self.listOfN(Math.max(0, n - 1))))
    return tail.prepend(head)
  })
}
