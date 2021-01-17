import { pipe } from "../src/Function"
import * as L from "../src/List"
import * as S from "../src/Sync"

describe("List", () => {
  it("use list", () => {
    expect(
      pipe(
        L.of(1),
        L.chain((n) => L.of(n + 1)),
        L.chain((n) => L.range_(0, n)),
        L.toArray
      )
    ).toEqual([0, 1])
  })
  it("foreach", () => {
    expect(
      pipe(
        L.from([0, 1, 2]),
        L.foreachF(S.Applicative)((n) => S.sync(() => n + 1)),
        S.run
      )
    ).toEqual(L.from([1, 2, 3]))
  })
})
