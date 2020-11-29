import * as C from "../src/Cause"
import * as T from "../src/Effect"
import * as Ex from "../src/Exit"
import type { Trace } from "../src/Fiber"
import { prettyTraceNode } from "../src/Fiber/tracingNode"
import { pipe } from "../src/Function"

const customNodeRender = (_: Trace): string =>
  prettyTraceNode(_, (_, path) => {
    return path.replace("system/build", "system")
  })

describe("Tracing & Optimizations", () => {
  it("should collect traces", async () => {
    const res = await pipe(
      T.succeed(1),
      T.chain((n) => {
        return T.succeed(n + 1)
      }),
      T.chain((n) => {
        return T.succeed(n + 1)
      }),
      T.chain((n) => {
        return T.succeed(n + 1)
      }),
      T.tap((n) => {
        return T.fail(`(${n})`)
      }),
      T.catchAll(function handle(n) {
        return T.succeed(n)
      }),
      T.chain((n) => {
        return T.fail(`error: ${n}`)
      }),
      T.chain(() => T.succeed(0)),
      T.result,
      T.runPromise
    )

    Ex.assertsFailure(res)

    console.log(C.pretty(res.cause, customNodeRender))

    expect(C.untraced(res.cause)).toEqual(C.fail("error: (4)"))
  })
  it("should collect 2", async () => {
    const res = await pipe(
      T.succeed("ok"),
      T.tap(() => T.unit),
      T.tap(() => T.unit),
      T.tap(() => T.unit),
      T.map((x) => `(${x})`),
      T.chain((n) => T.fail(`error: ${n}`)),
      T.runPromiseExit
    )

    Ex.assertsFailure(res)

    console.log(C.pretty(res.cause, customNodeRender))
  })
})
