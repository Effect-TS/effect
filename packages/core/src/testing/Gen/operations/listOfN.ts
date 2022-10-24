import * as List from "@fp-ts/data/List"

/**
 * @tsplus static effect/core/testing/Gen.Ops listOfN
 * @tsplus static effect/core/testing/Gen.Aspects listOfN
 * @tsplus pipeable effect/core/testing/Gen listOfN
 * @category mutations
 * @since 1.0.0
 */
export function listOfN(n: number) {
  return <R, A>(self: Gen<R, A>): Gen<R, List.List<A>> => {
    const builder: Array<Gen<R, A>> = []
    let i = n
    while (i > 0) {
      builder.push(self)
      i = i - 1
    }
    return Gen.collectAll(List.fromIterable(builder))
  }
}
