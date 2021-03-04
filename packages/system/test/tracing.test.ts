import "@effect-ts/tracing-utils/Enable"

import { pretty } from "../src/Cause"
import * as T from "../src/Effect"
import { assertsFailure } from "../src/Exit"
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
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:15:25")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:15:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:14:33")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:14:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:13:33")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:13:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:12:23")
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
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:35:22")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:35:11")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:34:24")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:34:11")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:32:23")
    expect(cause).toContain("error 0")
    expect(cause).toContain("error release")
  })
})
