import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as O from "effect/Option"
import { describe, expect, it } from "vitest"

describe("optional APIs", () => {
  it("annotations", async () => {
    const schema = S.struct({
      a: S.optional(S.NumberFromString, {
        exact: true
      }).annotations({ description: "my description" })
    })
    expect((schema.ast as any).propertySignatures[0].annotations).toStrictEqual({
      [AST.DescriptionAnnotationId]: "my description"
    })
  })

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
        `{ a?: NumberFromString | undefined }
└─ ["a"]
   └─ NumberFromString | undefined
      ├─ Union member
      │  └─ NumberFromString
      │     └─ Transformation process failure
      │        └─ Expected NumberFromString, actual "a"
      └─ Union member
         └─ Expected undefined, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    })
  })

  describe("optional > { nullable: true }", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { nullable: true })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: null }, {})
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `({ a?: NumberFromString | null | undefined } <-> { a?: number | undefined })
└─ Encoded side transformation failure
   └─ { a?: NumberFromString | null | undefined }
      └─ ["a"]
         └─ NumberFromString | null | undefined
            ├─ Union member
            │  └─ NumberFromString
            │     └─ Transformation process failure
            │        └─ Expected NumberFromString, actual "a"
            ├─ Union member
            │  └─ Expected null, actual "a"
            └─ Union member
               └─ Expected undefined, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    })
  })

  describe("optional > { exact: true, nullable: true }", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { exact: true, nullable: true })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: null }, {})
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: undefined },
        `({ a?: NumberFromString | null } <-> { a?: number })
└─ Encoded side transformation failure
   └─ { a?: NumberFromString | null }
      └─ ["a"]
         └─ NumberFromString | null
            ├─ Union member
            │  └─ NumberFromString
            │     └─ Encoded side transformation failure
            │        └─ Expected a string, actual undefined
            └─ Union member
               └─ Expected null, actual undefined`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `({ a?: NumberFromString | null } <-> { a?: number })
└─ Encoded side transformation failure
   └─ { a?: NumberFromString | null }
      └─ ["a"]
         └─ NumberFromString | null
            ├─ Union member
            │  └─ NumberFromString
            │     └─ Transformation process failure
            │        └─ Expected NumberFromString, actual "a"
            └─ Union member
               └─ Expected null, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, {}, {})
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
└─ Encoded side transformation failure
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
        `({ a?: NumberFromString | null } <-> { a: Option<number> })
└─ Encoded side transformation failure
   └─ { a?: NumberFromString | null }
      └─ ["a"]
         └─ NumberFromString | null
            ├─ Union member
            │  └─ NumberFromString
            │     └─ Transformation process failure
            │        └─ Expected NumberFromString, actual "a"
            └─ Union member
               └─ Expected null, actual "a"`
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
        `({ a?: NumberFromString | undefined } <-> { a: Option<number> })
└─ Encoded side transformation failure
   └─ { a?: NumberFromString | undefined }
      └─ ["a"]
         └─ NumberFromString | undefined
            ├─ Union member
            │  └─ NumberFromString
            │     └─ Transformation process failure
            │        └─ Expected NumberFromString, actual "a"
            └─ Union member
               └─ Expected undefined, actual "a"`
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
        `({ a?: NumberFromString | null | undefined } <-> { a: Option<number> })
└─ Encoded side transformation failure
   └─ { a?: NumberFromString | null | undefined }
      └─ ["a"]
         └─ NumberFromString | null | undefined
            ├─ Union member
            │  └─ NumberFromString
            │     └─ Transformation process failure
            │        └─ Expected NumberFromString, actual "a"
            ├─ Union member
            │  └─ Expected null, actual "a"
            └─ Union member
               └─ Expected undefined, actual "a"`
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
└─ Encoded side transformation failure
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
        `({ a?: NumberFromString | undefined } <-> { a: number })
└─ Encoded side transformation failure
   └─ { a?: NumberFromString | undefined }
      └─ ["a"]
         └─ NumberFromString | undefined
            ├─ Union member
            │  └─ NumberFromString
            │     └─ Transformation process failure
            │        └─ Expected NumberFromString, actual "a"
            └─ Union member
               └─ Expected undefined, actual "a"`
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
        `({ a?: NumberFromString | null | undefined } <-> { a: number })
└─ Encoded side transformation failure
   └─ { a?: NumberFromString | null | undefined }
      └─ ["a"]
         └─ NumberFromString | null | undefined
            ├─ Union member
            │  └─ NumberFromString
            │     └─ Transformation process failure
            │        └─ Expected NumberFromString, actual "a"
            ├─ Union member
            │  └─ Expected null, actual "a"
            └─ Union member
               └─ Expected undefined, actual "a"`
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
        `({ a?: NumberFromString | null } <-> { a: number })
└─ Encoded side transformation failure
   └─ { a?: NumberFromString | null }
      └─ ["a"]
         └─ NumberFromString | null
            ├─ Union member
            │  └─ NumberFromString
            │     └─ Transformation process failure
            │        └─ Expected NumberFromString, actual "a"
            └─ Union member
               └─ Expected null, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
    })
  })
})
