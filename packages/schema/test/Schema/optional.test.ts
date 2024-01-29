import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as O from "effect/Option"
import { describe, it } from "vitest"

describe("optional APIs", () => {
  describe("optional > { exact: true }", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { exact: true })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `{ a?: NumberFromString }
└─ ["a"]
   └─ NumberFromString
      └─ Transformation process failure
         └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    })

    it("never", async () => {
      const schema = S.struct({ a: S.optional(S.never, { exact: true }), b: S.number })
      await Util.expectDecodeUnknownSuccess(schema, { b: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: 1 },
        `{ a?: never; b: number }
└─ ["a"]
   └─ Expected never, actual "a"`
      )
    })
  })

  describe("optional", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString)
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `{ a?: undefined | NumberFromString }
└─ ["a"]
   └─ undefined | NumberFromString
      ├─ Union member
      │  └─ Expected undefined, actual "a"
      └─ Union member
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    })
  })

  describe(`optional > { exact: true, as: "Option" }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { exact: true, as: "Option" })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectDecodeUnknownFailure(
        schema,
        {
          a: "a"
        },
        `({ a?: NumberFromString } <-> { a: Option<number> })
└─ From side transformation failure
   └─ { a?: NumberFromString }
      └─ ["a"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
    })
  })

  describe(`optionalToOption > { exact: true, nullable: true, as: "Option" }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { exact: true, nullable: true, as: "Option" })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: null }, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectDecodeUnknownFailure(
        schema,
        {
          a: "a"
        },
        `({ a?: null | NumberFromString } <-> { a: Option<number> })
└─ From side transformation failure
   └─ { a?: null | NumberFromString }
      └─ ["a"]
         └─ null | NumberFromString
            ├─ Union member
            │  └─ Expected null, actual "a"
            └─ Union member
               └─ NumberFromString
                  └─ Transformation process failure
                     └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
    })
  })

  describe(`optional > { as: "Option" }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({ a: S.optional(S.NumberFromString, { as: "Option" }) })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectDecodeUnknownFailure(
        schema,
        {
          a: "a"
        },
        `({ a?: undefined | NumberFromString } <-> { a: Option<number> })
└─ From side transformation failure
   └─ { a?: undefined | NumberFromString }
      └─ ["a"]
         └─ undefined | NumberFromString
            ├─ Union member
            │  └─ Expected undefined, actual "a"
            └─ Union member
               └─ NumberFromString
                  └─ Transformation process failure
                     └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
    })
  })

  describe(`optional > { nullable: true, as: "Option" }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { nullable: true, as: "Option" })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: null }, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectDecodeUnknownFailure(
        schema,
        {
          a: "a"
        },
        `({ a?: null | undefined | NumberFromString } <-> { a: Option<number> })
└─ From side transformation failure
   └─ { a?: null | undefined | NumberFromString }
      └─ ["a"]
         └─ null | undefined | NumberFromString
            ├─ Union member
            │  └─ Expected null, actual "a"
            ├─ Union member
            │  └─ Expected undefined, actual "a"
            └─ Union member
               └─ NumberFromString
                  └─ Transformation process failure
                     └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
    })
  })

  describe("optional > { exact: true, default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { exact: true, default: () => 0 })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `({ a?: NumberFromString } <-> { a: number })
└─ From side transformation failure
   └─ { a?: NumberFromString }
      └─ ["a"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
    })
  })

  describe("optional > { default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { default: () => 0 })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `({ a?: undefined | NumberFromString } <-> { a: number })
└─ From side transformation failure
   └─ { a?: undefined | NumberFromString }
      └─ ["a"]
         └─ undefined | NumberFromString
            ├─ Union member
            │  └─ Expected undefined, actual "a"
            └─ Union member
               └─ NumberFromString
                  └─ Transformation process failure
                     └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
    })
  })

  describe("optional > { nullable: true, default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { nullable: true, default: () => 0 })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: null }, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `({ a?: null | undefined | NumberFromString } <-> { a: number })
└─ From side transformation failure
   └─ { a?: null | undefined | NumberFromString }
      └─ ["a"]
         └─ null | undefined | NumberFromString
            ├─ Union member
            │  └─ Expected null, actual "a"
            ├─ Union member
            │  └─ Expected undefined, actual "a"
            └─ Union member
               └─ NumberFromString
                  └─ Transformation process failure
                     └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
    })
  })

  describe("optional > { exact: true, nullable: true, default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { exact: true, nullable: true, default: () => 0 })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: null }, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `({ a?: null | NumberFromString } <-> { a: number })
└─ From side transformation failure
   └─ { a?: null | NumberFromString }
      └─ ["a"]
         └─ null | NumberFromString
            ├─ Union member
            │  └─ Expected null, actual "a"
            └─ Union member
               └─ NumberFromString
                  └─ Transformation process failure
                     └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
    })
  })
})
