import * as A from "../src/Array"
import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import * as R from "../src/Record"
import * as S from "../src/Sync"

const x: <A>(a: A.Array<A>) => S.UIO<A.Array<A>> = A.foreachF(S.Applicative)(S.succeed)

const res = S.run(x([0, 1, 2]))
const res1 = S.run(x(res))

const encodeField = T.succeed
const encodeRecord = R.foreachF(T.Applicative)(encodeField)
const encodeArray = pipe(
  [{ x: "a" }, { x: "b" }, { x: "c" }],
  A.foreachF(T.Applicative)(encodeRecord)
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
