import { describe, it } from "@effect/vitest"
import { assertInclude, assertInstanceOf, strictEqual, throws } from "@effect/vitest/utils"
import { Effect, ParseResult, Predicate, Schema as S } from "effect"
import * as Util from "../TestUtils.js"

const SyncEffectfulString = S.declare([], {
  decode: () => (u, _, ast) =>
    Predicate.isString(u) ? Effect.succeed(u) : Effect.fail(new ParseResult.Type(ast, u, "not a string")),
  encode: () => (u, _, ast) =>
    Predicate.isString(u) ? Effect.succeed(u) : Effect.fail(new ParseResult.Type(ast, u, "not a string"))
}, { identifier: "SyncEffectfulString" })

describe("decodeUnknownSync", () => {
  it("should return a ParseError when the input is invalid", () => {
    Util.assertions.parseError(() => S.decodeUnknownSync(S.String)(1), "Expected string, actual 1")
  })

  it("should decode synchronously even when the schema uses Effects", () => {
    strictEqual(S.decodeUnknownSync(SyncEffectfulString)("a"), "a")
    Util.assertions.parseError(() => {
      S.decodeUnknownSync(SyncEffectfulString)(null)
    }, "not a string")
  })

  it("should throw an error when the schema performs asynchronous work", () => {
    Util.assertions.parseError(
      () => S.decodeUnknownSync(Util.AsyncString)("a"),
      `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })

  it("should throw an error when required dependencies are missing", () => {
    throws(() => S.decodeUnknownSync(Util.DependencyString as any)("a"), (err) => {
      assertInstanceOf(err, ParseResult.ParseError)
      assertInclude(err.message, "Service not found: Name")
    })
  })
})
