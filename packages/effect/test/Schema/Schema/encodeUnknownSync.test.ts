import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("encodeUnknownSync", () => {
  it("should throw on async", () => {
    expect(() => S.encodeUnknownSync(Util.AsyncString)("a")).toThrow(
      new Error(
        `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      )
    )
  })
})
