// trace: on
// tracingModule: ../src/Tracing

import * as T from "../src/Effect"
import { identity, pipe } from "../src/Function"

const parseReg = /^(.*?):(\d+):(\d+):(.*?):(.*?)$/
export function parse(s: string) {
  const m = parseReg.exec(s)
  if (m) {
    const parts = m[1].split("/")
    return `(${m[4]}:${m[5]}): ${parts[parts.length - 2]}/${parts[parts.length - 1]}:${
      m[2]
    }:${m[3]}`
  }
  return ``
}

describe("Tracer", () => {
  it("trace", async () => {
    const traces = await pipe(
      T.tuple(T.succeed(1), T.succeed(2), T.succeed(3)),
      T.map(([a, b, c]) => a + b + c),
      T.bimap(identity, (n) => n + 1),
      T.andThen(T.checkExecutionTraces(T.succeed)),
      T.runPromise
    )

    expect(traces).toEqual([
      "packages/system/test/tracing.test.ts:22:7:Effect:tuple",
      "packages/system/test/tracing.test.ts:22:15:Effect:succeed",
      "packages/system/test/tracing.test.ts:22:29:Effect:succeed",
      "packages/system/test/tracing.test.ts:22:43:Effect:succeed",
      "packages/system/test/tracing.test.ts:23:13:Effect:map",
      "packages/system/test/tracing.test.ts:24:25:Effect:bimap"
    ])
  })

  it("trace generator", async () => {
    const traces = await T.runPromise(
      T.genM(function* ($) {
        const a = yield* $(T.succeed(1))
        const b = yield* $(T.succeed(2))

        yield* $(T.effectTotal(() => a + b))

        return yield* $(T.checkExecutionTraces(T.succeed))
      })
    )

    expect(traces).toEqual([])
  })
})
