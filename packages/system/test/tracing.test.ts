// trace :: T -> Effect
import * as T from "../src/Effect"
import { pipe } from "../src/Function"

const parseReg = /^(.*?):(\d+):(\d+)$/
function parse(s: string) {
  const m = parseReg.exec(s)
  if (m) {
    const parts = m[1].split("/")
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}:${m[2]}:${m[3]}`
  }
  return ``
}

describe("Tracer", () => {
  it("trace", async () => {
    const traces = await pipe(
      T.tuple(T.succeed(1), T.succeed(2), T.succeed(3)),
      T.map(([a, b, c]) => a + b + c),
      T.andThen(T.checkExecutionTraces((traces) => T.succeed(traces.map(parse)))),
      T.runPromise
    )

    expect(traces).toEqual([
      "test/tracing.test.ts:18:15",
      "test/tracing.test.ts:18:29",
      "test/tracing.test.ts:18:43"
    ])
  })
})
