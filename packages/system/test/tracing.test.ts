// trace: on
// tracingModule: ../src/Tracing

import * as T from "../src/Effect"
import { identity, pipe } from "../src/Function"
import * as O from "../src/Option"
import { foldTraced_, Traced } from "../src/Tracing"
import { CustomService, makeCustomService } from "./utils/service"

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
      "packages/system/test/tracing.test.ts:14:7:Effect:tuple",
      "packages/system/test/tracing.test.ts:14:15:Effect:succeed",
      "packages/system/test/tracing.test.ts:14:34:Effect:succeed",
      "packages/system/test/tracing.test.ts:14:53:Effect:succeed",
      "packages/system/test/tracing.test.ts:15:13:Effect:map",
      "packages/system/test/tracing.test.ts:16:25:Effect:bimap",
      "packages/system/test/tracing.test.ts:17:7:Effect:andThen"
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
      "packages/system/test/tracing.test.ts:35:26:Effect:bind",
      "packages/system/test/tracing.test.ts:35:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:36:26:Effect:bind",
      "packages/system/test/tracing.test.ts:36:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:37:16:Effect:bind",
      "packages/system/test/tracing.test.ts:37:32:Effect:effectTotal",
      "packages/system/test/tracing.test.ts:38:23:Effect:bind"
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
      "packages/system/test/tracing.test.ts:56:26:Effect:bind",
      "packages/system/test/tracing.test.ts:56:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:57:26:Effect:bind",
      "packages/system/test/tracing.test.ts:57:28:Effect:succeed",
      "packages/system/test/tracing.test.ts:58:16:Effect:bind",
      "packages/system/test/tracing.test.ts:58:32:Effect:effectTotal",
      "packages/system/test/tracing.test.ts:59:23:Effect:bind"
    ])
  })

  it("trace service", async () => {
    const traces = await pipe(
      T.accessServiceM(CustomService)((_) => _.printTrace(1)),
      T.andThen(T.checkExecutionTraces(T.succeed)),
      T.provideServiceM(CustomService)(makeCustomService),
      T.runPromise
    )

    expect(traces).toEqual([
      "packages/system/test/utils/service.ts:8:34:Effect:succeed",
      "packages/system/test/tracing.test.ts:76:39:Effect:accessServiceM",
      "packages/system/test/tracing.test.ts:76:46:CustomService:printTrace",
      "packages/system/test/utils/service.ts:14:29:Effect:chain_",
      "packages/system/test/utils/service.ts:14:35:Effect:succeed",
      "packages/system/test/tracing.test.ts:77:7:Effect:andThen"
    ])
  })

  it("should embed trace", () => {
    /**
     * @module Custom
     * @trace replace 0
     */
    function custom(n: number): O.Option<Traced<number>> {
      return foldTraced_(n, () => O.none, O.some)
    }

    const call = custom(1)

    expect(call).toEqual(
      O.some(new Traced(1, "packages/system/test/tracing.test.ts:101:25:Custom:custom"))
    )
  })

  it("should bind trace", async () => {
    /**
     * @module Custom
     * @trace bind
     */
    function custom(_n: number): T.UIO<readonly string[]> {
      return T.andThen_(
        T.effectTotal(
          T.traceF_(
            () => _n,
            // @ts-expect-error
            this["$trace"]
          )
        ),
        T.checkExecutionTraces(T.succeed)
      )
    }

    const call = await T.runPromise(custom(1))

    expect(call).toEqual([
      "packages/system/test/tracing.test.ts:114:14:Effect:andThen_",
      "packages/system/test/tracing.test.ts:126:37:Custom:custom"
    ])
  })
})
