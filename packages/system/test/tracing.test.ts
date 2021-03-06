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
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:15:33")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:15:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:14:33")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:14:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:13:23")
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
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:36:11")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:35:24")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:35:11")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:33:23")
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
      "test/tracing.test.ts:63:14",
      "test/tracing.test.ts:57:29",
      "test/tracing.test.ts:55:19",
      "test/tracing.test.ts:62:21",
      "test/tracing.test.ts:59:26",
      "test/tracing.test.ts:55:19",
      "test/tracing.test.ts:62:21",
      "test/tracing.test.ts:59:26",
      "test/tracing.test.ts:55:19",
      "test/tracing.test.ts:62:21",
      "test/tracing.test.ts:59:26",
      "test/tracing.test.ts:55:19"
    ])
  })
})
