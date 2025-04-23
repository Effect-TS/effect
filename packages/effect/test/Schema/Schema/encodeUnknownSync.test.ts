import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("encodeUnknownSync", () => {
  it("should throw on async", () => {
    Util.assertions.parseError(
      () => S.encodeUnknownSync(Util.AsyncString)("a"),
      `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })
})
