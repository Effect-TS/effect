/**
 * @tsplus static effect/core/testing/Gen.Ops listOfN
 * @tsplus static effect/core/testing/Gen.Aspects listOfN
 * @tsplus pipeable effect/core/testing/Gen listOfN
 */
export function listOfN(n: number) {
  return <R, A>(self: Gen<R, A>): Gen<R, List<A>> => {
    const list = List.builder<Gen<R, A>>()
    let i = n
    while (i > 0) {
      list.append(self)
      i = i - 1
    }
    return Gen.collectAll(list.build())
  }
}
