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
        T.tap(() => T.fail(0)),
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
      "packages/system/test/opt.test.ts:15:21:anonymous",
      "packages/system/test/opt.test.ts:17:18:anonymous",
      "packages/system/src/Effect/core.ts:273:61:succeed"
    ])
  })
})
