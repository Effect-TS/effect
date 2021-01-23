import * as C from "../src/Chunk"
import * as T from "../src/Effect"
import { pipe } from "../src/Function"

describe("Chunk", () => {
  it("concat", () => {
    const x = new Uint16Array(2)
    const y = new Uint16Array(2)

    x[0] = 1
    x[1] = 2
    y[0] = 3
    y[1] = 4

    expect(C.concat_(x, y)).toEqual(new Uint16Array([1, 2, 3, 4]))
  })

  it("takeWhileM", async () => {
    const chunk = C.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const result = await pipe(
      C.takeWhileM_(chunk, (a) => T.succeed(a <= 5)),
      T.runPromise
    )

    expect(result).toEqual(C.fromIterable([1, 2, 3, 4, 5]))
  })
})
