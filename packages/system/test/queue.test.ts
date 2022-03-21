import * as A from "../src/Collections/Immutable/Chunk/index.js"
import * as T from "../src/Effect/index.js"
import { pipe } from "../src/Function/index.js"
import * as Q from "../src/Queue/index.js"

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
  it("deals with falsy values", async () => {
    const result = await pipe(
      Q.makeUnbounded<number>(),
      T.tap((q) => Q.offer_(q, 0)),
      T.chain(Q.take),
      T.runPromise
    )
    expect(result).toEqual(0)
  })
})
