import "@effect-ts/tracing-utils/Enable"

import { pretty } from "../src/Cause"
import * as T from "../src/Effect"
import { assertsFailure } from "../src/Exit"
import { prettyTrace } from "../src/Fiber"
import { pipe } from "../src/Function"

describe("Tracing", () => {
  it("should trace andThen", async () => {
    const result = await T.runPromiseExit(
      pipe(
        T.effectTotal(() => 0),
        T.andThen(T.effectTotal(() => 1)),
        T.andThen(T.effectTotal(() => 2)),
        T.andThen(T.fail("error"))
      )
    )

    assertsFailure(result)
    const cause = pretty(result.cause)
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:16:25")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:16:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:15:32")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:15:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:14:32")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:14:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:13:22")
  })
  it("should trace bracket", async () => {
    const result = await T.runPromiseExit(
      pipe(
        T.effectTotal(() => 0),
        T.bracket(
          (n) => T.fail(`error ${n}`),
          () => T.die("error release")
        )
      )
    )

    assertsFailure(result)
    const cause = pretty(result.cause)
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:36:22")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:35:24")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:34:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:33:22")
    expect(cause).toContain("error 0")
    expect(cause).toContain("error release")
  })
  it("should trace eventually", async () => {
    let n = 0
    const [res, trace] = await T.runPromise(
      pipe(
        T.suspend(() => {
          if (n > 2) {
            return T.succeed(n)
          } else {
            return T.fail(n++)
          }
        }),
        T.eventually,
        T.zip(T.trace)
      )
    )
    expect(res).toEqual(3)
    const cause = prettyTrace(trace).matchAll(
      new RegExp("\\(@effect-ts/system/test\\): (.*)", "g")
    )
    expect(Array.from(cause).map((s) => s[1])).toEqual([
      "test/tracing.test.ts:62:14",
      "test/tracing.test.ts:56:29",
      "test/tracing.test.ts:54:18",
      "test/tracing.test.ts:58:26",
      "test/tracing.test.ts:54:18",
      "test/tracing.test.ts:58:26",
      "test/tracing.test.ts:54:18",
      "test/tracing.test.ts:61:21",
      "test/tracing.test.ts:58:26",
      "test/tracing.test.ts:54:18"
    ])
  })
  it("should trace firstSuccessOf", async () => {
    const exit = await T.runPromiseExit(
      T.firstSuccessOf([T.failWith(() => 0), T.failWith(() => 1), T.failWith(() => 2)])
    )

    assertsFailure(exit)
    const cause = pretty(exit.cause)

    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:84:23"
    )
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:84:77")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:84:56")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:84:35")
  })
  it("should trace tuple", async () => {
    const exit = await T.runPromiseExit(T.tuple(T.succeed(0), T.succeed(1), T.fail(0)))

    assertsFailure(exit)
    const cause = pretty(exit.cause)

    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:98:48"
    )
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:98:83")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:98:72")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:98:58")
  })
  it("should trace tuplePar", async () => {
    const exit = await T.runPromiseExit(
      T.tuplePar(T.succeed(0), T.succeed(1), T.fail(0))
    )

    assertsFailure(exit)
    const cause = pretty(exit.cause)

    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:112:17"
    )
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:112:52")
  })
  it("should trace tupleParN", async () => {
    const exit = await T.runPromiseExit(
      T.tupleParN(2)(
        T.delay(10)(T.succeed(0)),
        T.delay(10)(T.succeed(1)),
        T.delay(10)(T.fail(0))
      )
    )

    assertsFailure(exit)
    const cause = pretty(exit.cause)

    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:125:21"
    )
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:128:27")
  })
})
