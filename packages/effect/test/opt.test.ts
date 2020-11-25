/**
 * tracing: on
 */
import * as T from "../src/Effect"
import { pipe } from "../src/Function"

describe("Optimizations", () => {
  it("chain data first", async () => {
    expect(
      await pipe(
        T.succeed(1),
        T.chain((n) => T.succeed(n + 1)),
        T.chain((n) => T.succeed(n + 1)),
        T.chain((n) => T.succeed(n + 1)),
        T.tap(T.fail),
        T.foldM(
          (n) => T.succeed(n),
          (n) => T.succeed(n + 1)
        ),
        T.andThen(T.checkExecutionTraces(T.succeed)),
        T.runPromise
      )
    ).toEqual([
      "packages/system/test/opt.test.ts:12:24:anonymous",
      "packages/system/test/opt.test.ts:13:24:anonymous",
      "packages/system/test/opt.test.ts:14:24:anonymous",
      "packages/system/src/Effect/fail.ts:10:31:fail",
      "packages/system/test/opt.test.ts:17:18:anonymous",
      "packages/system/src/Effect/core.ts:275:61:succeed"
    ])
  })
})
