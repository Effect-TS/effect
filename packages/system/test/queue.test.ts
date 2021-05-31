import * as A from "../src/Collections/Immutable/Chunk"
import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import * as Q from "../src/Queue"

describe("Queue", () => {
  it("maps", async () => {
    const result = await pipe(
      Q.makeUnbounded<number>(),
      T.map(Q.map((x) => `The number is ${x}`)),
      T.tap(Q.offer(10)),
      T.tap(Q.offer(20)),
      T.chain(Q.takeAll),
      T.runPromise
    )
    expect(result).toEqual(A.from(["The number is 10", "The number is 20"]))
  })
})
