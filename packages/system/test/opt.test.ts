/**
 * relative: ../
 * tracing: on
 */
import * as C from "../src/Cause"
import * as T from "../src/Effect"
import * as Ex from "../src/Exit"
import { pipe } from "../src/Function"

describe("Optimizations", () => {
  it("chain data first", async () => {
    const res = await pipe(
      T.succeed(1),
      T.chain((n) => T.succeed(n + 1)),
      T.chain((n) => T.succeed(n + 1)),
      T.chain((n) => T.succeed(n + 1)),
      T.tap((n) => T.fail(`(${n})`)),
      T.catchAll(function handle(n) {
        return T.succeed(n)
      }),
      T.chain((n) => T.fail(`error: ${n}`)),
      T.chain(() => T.succeed(0)),
      T.result,
      T.runPromise
    )

    Ex.assertsFailure(res)

    console.log(C.pretty(res.cause, "packages/system/"))

    expect(C.untraced(res.cause)).toEqual(C.fail("error: (4)"))
  })
})
