// trace: on
// tracingModule: ../src/Tracing

import * as T from "../src/Effect"
import { identity, pipe } from "../src/Function"
import { tag } from "../src/Has"
import { fromNullable, some } from "../src/Option"
import type { _A } from "../src/Utils"

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
      "packages/system/test/tracing.test.ts:23:7:Effect:tuple",
      "packages/system/test/tracing.test.ts:23:15:Effect:succeed",
      "packages/system/test/tracing.test.ts:23:34:Effect:succeed",
      "packages/system/test/tracing.test.ts:23:53:Effect:succeed",
      "packages/system/test/tracing.test.ts:24:13:Effect:map",
      "packages/system/test/tracing.test.ts:25:25:Effect:bimap"
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
      "packages/system/test/tracing.test.ts:43:26:Effect:bind",
      "packages/system/test/tracing.test.ts:43:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:44:26:Effect:bind",
      "packages/system/test/tracing.test.ts:44:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:45:16:Effect:bind",
      "packages/system/test/tracing.test.ts:45:32:Effect:effectTotal",
      "packages/system/test/tracing.test.ts:46:23:Effect:bind"
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
      "packages/system/test/tracing.test.ts:64:26:Effect:bind",
      "packages/system/test/tracing.test.ts:64:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:65:26:Effect:bind",
      "packages/system/test/tracing.test.ts:65:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:66:16:Effect:bind",
      "packages/system/test/tracing.test.ts:66:32:Effect:effectTotal",
      "packages/system/test/tracing.test.ts:67:23:Effect:bind"
    ])
  })

  it("trace service", async () => {
    const makeService = T.succeed({
      /**
       * @module Service
       * @trace 0
       */
      printTrace<A>(f: () => A) {
        return T.effectTotal(() => fromNullable<string>(f["$trace"]))
      }
    })
    interface Service extends _A<typeof makeService> {}
    const Service = tag<Service>()

    const traces = await pipe(
      T.accessServiceM(Service)((_) => _.printTrace(() => 1)),
      T.provideServiceM(Service)(makeService),
      T.runPromise
    )

    expect(traces).toEqual(
      some("packages/system/test/tracing.test.ts:99:53:Service:printTrace")
    )
  })
})
