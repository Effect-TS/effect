import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertTrue } from "effect/test/util"
import { describe, it } from "vitest"

describe("decodeUnknownSync", () => {
  it("the returned error should be a ParseError", () => {
    try {
      S.decodeUnknownSync(S.String)(1)
    } catch (e) {
      assertTrue(ParseResult.isParseError(e))
    }
  })

  it("should throw on async", () => {
    Util.assertions.parseError(
      () => S.decodeUnknownSync(Util.AsyncString)("a"),
      `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })

  it("should throw on unexpected dependencies", () => {
    try {
      S.decodeUnknownSync(Util.DependencyString as any)("a")
      throw new Error("unexpected success")
    } catch (e: any) {
      assertTrue((e.message as string).includes("Service not found: Name"))
    }
  })
})
