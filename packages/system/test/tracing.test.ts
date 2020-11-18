import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import { globalTracingEnabled } from "../src/Tracing"

globalTracingEnabled.set(true)

describe("Tracing", () => {
  it("should trace", async () => {
    console.log(
      await pipe(
        T.succeed(0),
        T.map((n) => n + 1),
        T.map((n) => n + 1),
        T.map((n) => n + 1),
        T.chain((n) => T.tuple(T.succeed(n), T.executionTraces)),
        T.runPromise
      )
    )
  })
})
