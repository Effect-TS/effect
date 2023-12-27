import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema/extend", () => {
  describe("decoding", () => {
    it(`struct extend struct (dual)`, async () => {
      const schema = S.extend(S.struct({ a: S.string }), S.struct({ b: S.number }))
      await Util.expectParseSuccess(schema, { a: "a", b: 1 })
    })

    it(`struct with defaults extend struct`, async () => {
      const schema = S.struct({
        a: S.optional(S.string, { exact: true, default: () => "" }),
        b: S.string
      })
        .pipe(
          S.extend(S.struct({ c: S.number }))
        )
      await Util.expectParseSuccess(schema, { b: "b", c: 1 }, { a: "", b: "b", c: 1 })
    })

    it(`struct extend struct with defaults`, async () => {
      const schema = S.struct({ a: S.number }).pipe(
        S.extend(
          S.struct({ b: S.string, c: S.optional(S.string, { exact: true, default: () => "" }) })
        )
      )
      await Util.expectParseSuccess(schema, { a: 1, b: "b" }, { a: 1, b: "b", c: "" })
    })

    it(`struct with defaults extend struct with defaults `, async () => {
      const schema = S.struct({
        a: S.optional(S.string, { exact: true, default: () => "" }),
        b: S.string
      })
        .pipe(
          S.extend(
            S.struct({
              c: S.optional(S.number, { exact: true, default: () => 0 }),
              d: S.boolean
            })
          )
        )
      await Util.expectParseSuccess(schema, { b: "b", d: true }, { a: "", b: "b", c: 0, d: true })
    })

    it(`union with defaults extend union with defaults `, async () => {
      const schema = S.union(
        S.struct({
          a: S.optional(S.string, { exact: true, default: () => "a" }),
          b: S.string
        }),
        S.struct({
          c: S.optional(S.string, { exact: true, default: () => "c" }),
          d: S.string
        })
      ).pipe(
        S.extend(
          S.union(
            S.struct({
              e: S.optional(S.string, { exact: true, default: () => "e" }),
              f: S.string
            }),
            S.struct({
              g: S.optional(S.string, { exact: true, default: () => "g" }),
              h: S.string
            })
          )
        )
      )
      await Util.expectParseSuccess(schema, { b: "b", f: "f" }, {
        a: "a",
        b: "b",
        e: "e",
        f: "f"
      })
      await Util.expectParseSuccess(schema, { d: "d", h: "h" }, {
        c: "c",
        d: "d",
        g: "g",
        h: "h"
      })
    })

    it(`struct extend union`, () => {
      const schema = S.struct({ b: S.boolean }).pipe(
        S.extend(S.union(
          S.struct({ a: S.literal("a") }),
          S.struct({ a: S.literal("b") })
        ))
      )
      const is = S.is(schema)

      expect(is({ a: "a", b: false })).toBe(true)
      expect(is({ a: "b", b: false })).toBe(true)

      expect(is({ a: "a" })).toBe(false)
      expect(is({ a: "b" })).toBe(false)
    })

    it(`union extend struct`, () => {
      const schema = S.union(
        S.struct({ a: S.literal("a") }),
        S.struct({ b: S.literal("b") })
      ).pipe(
        S.extend(S.struct({ c: S.boolean }))
      )
      const is = S.is(schema)

      expect(is({ a: "a", c: false })).toBe(true)
      expect(is({ b: "b", c: false })).toBe(true)

      expect(is({ a: "a" })).toBe(false)
      expect(is({ a: "b" })).toBe(false)
    })

    it(`union extend union`, () => {
      const schema = S.union(
        S.struct({ a: S.literal("a") }),
        S.struct({ a: S.literal("b") })
      ).pipe(
        S.extend(
          S.union(
            S.struct({ c: S.boolean }),
            S.struct({ d: S.number })
          )
        )
      )
      const is = S.is(schema)

      expect(is({ a: "a", c: false })).toBe(true)
      expect(is({ a: "b", d: 69 })).toBe(true)
      expect(is({ a: "a", d: 69 })).toBe(true)
      expect(is({ a: "b", c: false })).toBe(true)

      expect(is({ a: "a" })).toBe(false)
      expect(is({ a: "b" })).toBe(false)
      expect(is({ c: false })).toBe(false)
      expect(is({ d: 42 })).toBe(false)
    })

    // -------------------------------------------------------------------------------------
    // errors
    // -------------------------------------------------------------------------------------

    it("can only handle type literals or unions of type literals", () => {
      expect(() => S.string.pipe(S.extend(S.number))).toThrow(
        new Error("`extend` can only handle type literals or unions of type literals")
      )
    })

    it(`extend/overlapping index signatures/ string`, () => {
      expect(() =>
        S.record(S.string, S.number).pipe(
          S.extend(S.record(S.string, S.boolean))
        )
      ).toThrow(new Error("Duplicate index signature for type `string`"))
    })

    it(`extend/overlapping index signatures/ symbol`, () => {
      expect(() =>
        S.record(S.symbolFromSelf, S.number).pipe(
          S.extend(S.record(S.symbolFromSelf, S.boolean))
        )
      ).toThrow(new Error("Duplicate index signature for type `symbol`"))
    })

    it("extend/overlapping index signatures/ refinements", () => {
      expect(() =>
        S.record(S.string, S.number).pipe(
          S.extend(S.record(S.string.pipe(S.minLength(2)), S.boolean))
        )
      ).toThrow(new Error("Duplicate index signature for type `string`"))
    })

    it(`overlapping property signatures`, () => {
      expect(() =>
        S.struct({ a: S.literal("a") }).pipe(
          S.extend(S.struct({ a: S.string }))
        )
      ).toThrow(new Error("Duplicate property signature a"))
      expect(() =>
        S.struct({ a: S.literal("a") }).pipe(
          S.extend(
            S.union(
              S.struct({ a: S.string }),
              S.struct({ b: S.number })
            )
          )
        )
      ).toThrow(new Error("Duplicate property signature a"))
    })

    it("struct extend record(string, string)", async () => {
      const schema = S.struct({ a: S.string }).pipe(
        S.extend(S.record(S.string, S.string))
      )
      await Util.expectParseSuccess(schema, { a: "a" })
      await Util.expectParseSuccess(schema, { a: "a", b: "b" })

      await Util.expectParseFailure(schema, {}, "/a is missing")
      await Util.expectParseFailure(schema, { b: "b" }, "/a is missing")
      await Util.expectParseFailure(schema, { a: 1 }, "/a Expected string, actual 1")
      await Util.expectParseFailure(
        schema,
        { a: "a", b: 1 },
        "/b Expected string, actual 1"
      )
    })

    it("struct extend record(templateLiteral, string)", async () => {
      const schema = S.struct({ a: S.string }).pipe(
        S.extend(S.record(
          S.templateLiteral(
            S.string,
            S.literal("-"),
            S.number
          ),
          S.string
        ))
      )
      // type A = {
      //   [x: `${string}-${number}`]: string
      //   readonly a: string
      // }
      // const a: A = { a: "a" } // OK
      await Util.expectParseSuccess(schema, { a: "a" })
    })

    describe("both operands are transformations", () => {
      const BoolFromString = S.transform(
        S.string,
        S.boolean,
        (x) => !!x,
        (x) => "" + x
      )

      it("optional, transformation", async () => {
        const schema = S.struct({
          a: S.optional(S.boolean, { exact: true, default: () => true })
        }).pipe(
          S.extend(
            S.struct({
              b: S.array(BoolFromString)
            })
          )
        )

        await Util.expectParseSuccess(schema, {
          b: ["a"]
        }, { a: true, b: [true] })
      })

      it("transformation, optional", async () => {
        const schema = S.struct({
          b: S.array(BoolFromString)
        }).pipe(
          S.extend(
            S.struct({
              a: S.optional(S.boolean, { exact: true, default: () => true })
            })
          )
        )

        await Util.expectParseSuccess(schema, {
          b: ["a"]
        }, { a: true, b: [true] })
      })
    })
  })

  describe("encoding", () => {
    it("struct + record(string, NumberFromChar)", async () => {
      const schema = S.struct({ a: S.number }).pipe(
        S.extend(S.record(S.string, Util.NumberFromChar))
      )
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeSuccess(schema, { a: 1, b: 1 }, { a: 1, b: "1" })
    })

    it("struct + record(symbol, NumberFromChar)", async () => {
      const b = Symbol.for("@effect/schema/test/b")
      const schema = S.struct({ a: S.number }).pipe(
        S.extend(S.record(S.symbolFromSelf, Util.NumberFromChar))
      )
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeSuccess(schema, { a: 1, [b]: 1 }, { a: 1, [b]: "1" })
    })
  })
})
