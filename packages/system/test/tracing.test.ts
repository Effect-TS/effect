// trace: on
// tracingModule: ../src/Tracing

import * as T from "../src/Effect"
import { identity, pipe } from "../src/Function"
import { CustomService, makeCustomService } from "./utils/service"

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
    const aliasedSucceed = T.succeed
    const traces = await pipe(
      T.tuple(aliasedSucceed(1), aliasedSucceed(2), aliasedSucceed(3)),
      T.map(([a, b, c]) => a + b + c),
      T.bimap(identity, (n) => n + 1),
      T.andThen(T.checkExecutionTraces(T.succeed)),
      T.runPromise
    )

    expect(traces).toEqual([
      "packages/system/test/tracing.test.ts:25:7:Effect:tuple",
      "packages/system/test/tracing.test.ts:25:15:Effect:succeed",
      "packages/system/test/tracing.test.ts:25:34:Effect:succeed",
      "packages/system/test/tracing.test.ts:25:53:Effect:succeed",
      "packages/system/test/tracing.test.ts:26:13:Effect:map",
      "packages/system/test/tracing.test.ts:27:25:Effect:bimap"
    ])
  })

  it("trace generatorM", async () => {
    const traces = await T.runPromise(
      T.genM(function* ($) {
        const a = yield* $(T.succeed(1))
        const b = yield* $(T.succeed(2))
        yield* $(T.effectTotal(() => a + b))
        return yield* $(T.checkExecutionTraces(T.succeed))
      })
    )

    expect(traces).toEqual([
      "packages/system/test/tracing.test.ts:45:26:Effect:bind",
      "packages/system/test/tracing.test.ts:45:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:46:26:Effect:bind",
      "packages/system/test/tracing.test.ts:46:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:47:16:Effect:bind",
      "packages/system/test/tracing.test.ts:47:32:Effect:effectTotal",
      "packages/system/test/tracing.test.ts:48:23:Effect:bind"
    ])
  })

  it("trace generator", async () => {
    const traces = await T.runPromise(
      T.gen(function* ($) {
        const a = yield* $(T.succeed(1))
        const b = yield* $(T.succeed(2))
        yield* $(T.effectTotal(() => a + b))
        return yield* $(T.checkExecutionTraces(T.succeed))
      })
    )

    expect(traces).toEqual([
      "packages/system/test/tracing.test.ts:66:26:Effect:bind",
      "packages/system/test/tracing.test.ts:66:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:67:26:Effect:bind",
      "packages/system/test/tracing.test.ts:67:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:68:16:Effect:bind",
      "packages/system/test/tracing.test.ts:68:32:Effect:effectTotal",
      "packages/system/test/tracing.test.ts:69:23:Effect:bind"
    ])
  })

  it("trace service", async () => {
    const traces = await pipe(
      T.accessServiceM(CustomService)((_) => _.printTrace(() => 1)),
      T.andThen(T.checkExecutionTraces(T.succeed)),
      T.provideServiceM(CustomService)(makeCustomService),
      T.runPromise
    )

    console.log(traces)

    expect(traces).toEqual([
      "packages/system/test/tracing.test.ts:98:53:Service:printTrace"
    ])
  })
})
