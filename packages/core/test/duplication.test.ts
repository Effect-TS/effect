import * as A from "../src/Classic/Array"
import * as S from "../src/Sync"

const x: <A>(a: A.Array<A>) => S.UIO<A.Array<A>> = A.foreachF(S.Applicative)(S.succeed)

const res = S.run(x([0, 1, 2]))
const res1 = S.run(x(res))

describe("Dupe Bug", () => {
  it("not dupe", () => {
    expect(res1).toEqual([0, 1, 2])
  })
})
