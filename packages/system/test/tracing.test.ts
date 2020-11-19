// trace :: T -> Effect
import * as T from "../src/Effect"
import { pipe } from "../src/Function"

describe("Tracer", () => {
  it("trace", async () => {
    await pipe(
      T.succeed(0),
      T.map((n) => n + 1),
      T.runPromise
    )
  })
})
