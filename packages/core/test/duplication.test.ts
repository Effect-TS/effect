import * as A from "../src/Collections/Immutable/Array/index.js"
import * as R from "../src/Collections/Immutable/Dictionary/index.js"
import * as T from "../src/Effect/index.js"
import { pipe } from "../src/Function/index.js"
import * as S from "../src/Sync/index.js"

const x: <A>(a: A.Array<A>) => S.UIO<A.Array<A>> = A.forEachF(S.Applicative)(S.succeed)

const res = S.run(x([0, 1, 2]))
const res1 = S.run(x(res))

const encodeField = T.succeed
const encodeRecord = R.forEachF(T.Applicative)(encodeField)
const encodeArray = pipe(
  [{ x: "a" }, { x: "b" }, { x: "c" }],
  A.forEachF(T.Applicative)(encodeRecord)
)

describe("Dupe Bug", () => {
  it("not dupe", () => {
    expect(res1).toEqual([0, 1, 2])
  })
  it("not dupe 2", () => {
    expect(S.run(x([{ value: "A" }, { value: "B" }, { value: "C" }]))).toEqual([
      { value: "A" },
      { value: "B" },
      { value: "C" }
    ])
  })
  it("not repeat", async () => {
    expect(await T.runPromise(encodeArray)).toEqual([
      { x: "a" },
      { x: "b" },
      { x: "c" }
    ])
  })
})
