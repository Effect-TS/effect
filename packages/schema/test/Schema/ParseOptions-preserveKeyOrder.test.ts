import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import type { Duration } from "effect"
import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"

describe("`preserveKeyOrder` option", () => {
  const b = Symbol.for("@effect/schema/test/b")
  const Sync = S.Struct({
    a: S.Literal("a"),
    [b]: S.Array(S.String),
    c: S.Record({ key: S.String, value: S.Number }),
    d: S.NumberFromString,
    e: S.Boolean,
    f: S.optional(S.String),
    g: S.optional(S.String)
  })

  const effectify = (duration: Duration.DurationInput) =>
    S.NumberFromString.pipe(
      S.transformOrFail(S.Number, {
        strict: true,
        decode: (x) => Effect.sleep(duration).pipe(Effect.andThen(ParseResult.succeed(x))),
        encode: ParseResult.succeed
      })
    )

  const Async = S.Struct({
    a: effectify("20 millis"),
    [b]: effectify("30 millis"),
    c: effectify("10 millis")
  }).annotations({ concurrency: 3 })

  describe("decoding", () => {
    it("should preserve the order of input properties (sync)", () => {
      const input = { [b]: ["b"], c: { c: 1 }, d: "1", e: true, a: "a", other: 1, f: undefined }
      const output = S.decodeUnknownSync(Sync)(input, { propertyOrder: "original", onExcessProperty: "preserve" })
      const expectedOutput = { [b]: ["b"], c: { c: 1 }, d: 1, e: true, a: "a", other: 1, f: undefined }
      expect(output).toStrictEqual(expectedOutput)
      expect(Reflect.ownKeys(output)).toStrictEqual(Reflect.ownKeys(expectedOutput))
    })

    it("should preserve the order of input properties (async)", async () => {
      const input = { a: "1", c: "3", [b]: "2", other: 1 }
      const output = await Effect.runPromise(
        S.decodeUnknown(Async)(input, { propertyOrder: "original", onExcessProperty: "preserve" })
      )
      const expectedOutput = { a: 1, c: 3, [b]: 2, other: 1 }
      expect(output).toStrictEqual(expectedOutput)
      expect(Reflect.ownKeys(output)).toStrictEqual(Reflect.ownKeys(expectedOutput))
    })
  })

  describe("encoding", () => {
    it("should preserve the order of input properties (sync)", () => {
      const input = { [b]: ["b"], c: { c: 1 }, d: 1, e: true, a: "a", other: 1, f: undefined }
      const output = S.encodeUnknownSync(Sync)(input, { propertyOrder: "original", onExcessProperty: "preserve" })
      const expectedOutput = { [b]: ["b"], c: { c: 1 }, d: "1", e: true, a: "a", other: 1, f: undefined }
      expect(output).toStrictEqual(expectedOutput)
      expect(Reflect.ownKeys(output)).toStrictEqual(Reflect.ownKeys(expectedOutput))
    })

    it("should preserve the order of input properties (async)", async () => {
      const input = { a: 1, c: 3, [b]: 2, other: 1 }
      const output = await Effect.runPromise(
        S.encodeUnknown(Async)(input, { propertyOrder: "original", onExcessProperty: "preserve" })
      )
      const expectedOutput = { a: "1", c: "3", [b]: "2", other: 1 }
      expect(output).toStrictEqual(expectedOutput)
      expect(Reflect.ownKeys(output)).toStrictEqual(Reflect.ownKeys(expectedOutput))
    })
  })
})
