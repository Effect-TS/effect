import "@effect-ts/tracing-utils/Enable"

import { pretty } from "../../src/Cause"
import * as T from "../../src/Effect"
import { assertsFailure } from "../../src/Exit"
import * as S from "../../src/Experimental/Stream"
import { pipe } from "../../src/Function"

describe("Stream Tracing", () => {
  it("traces stream", async () => {
    const exit = await pipe(
      S.iterate(0, (n) => n + 1),
      S.map((n) => {
        if (n > 2) {
          throw "ok"
        }
        return n + 1
      }),
      S.runList,
      T.runPromiseExit
    )
    assertsFailure(exit)

    const cause = Array.from(
      pretty(exit.cause).matchAll(new RegExp("\\(@effect-ts/system/test\\): (.*)", "g"))
    ).map((s) => s[1])

    expect(cause).toEqual([
      "test/experimental/streams.tracing.test.ts:19:16",
      "test/experimental/streams.tracing.test.ts:13:12",
      "test/experimental/streams.tracing.test.ts:12:16",
      "test/experimental/streams.tracing.test.ts:13:12",
      "test/experimental/streams.tracing.test.ts:12:16",
      "test/experimental/streams.tracing.test.ts:13:12",
      "test/experimental/streams.tracing.test.ts:12:16",
      "test/experimental/streams.tracing.test.ts:13:12",
      "test/experimental/streams.tracing.test.ts:12:16"
    ])
  })
})
