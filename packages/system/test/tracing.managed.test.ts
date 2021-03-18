import "@effect-ts/tracing-utils/Enable"

import { pretty } from "../src/Cause"
import * as T from "../src/Effect"
import { assertsFailure } from "../src/Exit"
//import { prettyTrace } from "../src/Fiber"
import { pipe } from "../src/Function"
//import { tag } from "../src/Has"
import * as M from "../src/Managed"

describe("Tracing Managed", () => {
  it("should trace fromEffect", async () => {
    const result = await T.runPromiseExit(
      pipe(
        M.fromEffect(T.effectTotal(() => 1)),
        M.use((_) => T.fail(_))
      )
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain(
      "(@effect-ts/system/test): test/tracing.managed.test.ts:16:28"
    )
    expect(cause).toContain(
      "(@effect-ts/system/test): test/tracing.managed.test.ts:15:35"
    )
    expect(cause).toContain(
      "(@effect-ts/system/test): test/tracing.managed.test.ts:15:21"
    )
  })
  it("should trace makeExit", async () => {
    const result = await T.runPromiseExit(
      pipe(
        M.makeExit_(
          T.effectTotal(() => 1),
          () => T.die("release")
        ),
        M.use(T.succeed)
      )
    )

    assertsFailure(result)

    const cause = pretty(result.cause).matchAll(
      new RegExp("\\(@effect-ts/system/test\\): (.*)", "g")
    )

    expect(Array.from(cause).map((s) => s[1])).toEqual([
      "test/tracing.managed.test.ts:38:22",
      "test/tracing.managed.test.ts:36:20",
      "test/tracing.managed.test.ts:40:24",
      "test/tracing.managed.test.ts:37:24",
      "test/tracing.managed.test.ts:36:20"
    ])
  })
  it("should trace forEachPar", async () => {
    const result = await T.runPromiseExit(
      pipe(
        [0, 1, 2],
        M.forEachPar((n) =>
          M.makeExit_(
            T.effectTotal(() => n),
            () => (n === 2 ? T.die("error") : T.unit)
          )
        ),
        M.use(T.succeed)
      )
    )

    assertsFailure(result)

    const cause = pretty(result.cause).matchAll(
      new RegExp("\\(@effect-ts/system/test\\): (.*)", "g")
    )

    expect(Array.from(cause).map((s) => s[1])).toEqual([
      "test/tracing.managed.test.ts:65:35",
      "test/tracing.managed.test.ts:63:22",
      "test/tracing.managed.test.ts:62:21",
      "test/tracing.managed.test.ts:68:24",
      "test/tracing.managed.test.ts:62:21"
    ])
  })
})
