/**
 * tracing: on
 */
import * as C from "../src/Cause"
import * as T from "../src/Effect"
import * as Ex from "../src/Exit"
import * as F from "../src/Fiber"
import { pipe } from "../src/Function"
import * as L from "../src/List"

describe("Optimizations", () => {
  it("chain data first", async () => {
    expect(
      await pipe(
        T.succeed(1),
        T.chain((n) => T.succeed(n + 1)),
        T.chain((n) => T.succeed(n + 1)),
        T.chain((n) => T.succeed(n + 1)),
        T.tap(T.fail),
        T.catchAll(function handle(n) {
          return T.succeed(n)
        }),
        T.chain((n) =>
          T.haltWith((trace) =>
            pipe(trace(), (trace) =>
              C.Fail({
                n,
                trace: {
                  ...trace,
                  fiberId: F.None
                }
              })
            )
          )
        ),
        T.runPromiseExit
      )
    ).toEqual(
      Ex.fail({
        n: 4,
        trace: {
          executionTrace: L.from([
            "opt.test.ts:24:11:anonymous",
            "opt.test.ts:20:39:handle",
            "Effect/fail.ts:13:31:fail",
            "opt.test.ts:18:24:anonymous",
            "opt.test.ts:17:24:anonymous",
            "opt.test.ts:16:24:anonymous"
          ]),
          fiberId: F.None,
          parentTrace: {
            _tag: "None"
          },
          stackTrace: L.from([])
        }
      })
    )
  })
})
