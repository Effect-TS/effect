import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as O from "effect/Option"
import { describe, expect, it } from "vitest"

describe("optional APIs", () => {
  it("annotations", async () => {
    const schema = S.Struct({
      a: S.optional(S.NumberFromString, {
        exact: true
      }).annotations({ description: "my description" })
    })
    expect((schema.ast as any).propertySignatures[0].annotations).toStrictEqual({
      [AST.DescriptionAnnotationId]: "my description"
    })
  })

  describe("optional > { exact: true }", () => {
    it("should expose a from property", () => {
      const schema = S.optional(S.String, { exact: true })
      expect(schema.from).toStrictEqual(S.String)
    })

    it("should expose a from property after an annotations call", () => {
      const schema = S.optional(S.String, { exact: true }).annotations({})
      expect(schema.from).toStrictEqual(S.String)
    })

    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { exact: true })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `{ readonly a?: NumberFromString }
└─ ["a"]
   └─ NumberFromString
      └─ Transformation process failure
         └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    })

    it("never", async () => {
      const schema = S.Struct({ a: S.optional(S.Never, { exact: true }), b: S.Number })
      await Util.expectDecodeUnknownSuccess(schema, { b: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: 1 },
        `{ readonly a?: never; readonly b: number }
└─ ["a"]
   └─ Expected never, actual "a"`
      )
    })
  })

  describe("optional", () => {
    it("should expose a from property", () => {
      const schema = S.optional(S.String)
      expect(schema.from).toStrictEqual(S.String)
    })

    it("should expose a from property after an annotations call", () => {
      const schema = S.optional(S.String).annotations({})
      expect(schema.from).toStrictEqual(S.String)
    })

    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString)
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `{ readonly a?: NumberFromString | undefined }
└─ ["a"]
   └─ NumberFromString | undefined
      ├─ NumberFromString
      │  └─ Transformation process failure
      │     └─ Expected NumberFromString, actual "a"
      └─ Expected undefined, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    })
  })

  describe("optional > { nullable: true }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { nullable: true })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: null }, {})
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null | undefined
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            ├─ Expected null, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    })
  })

  describe("optional > { exact: true, nullable: true }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { exact: true, nullable: true })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: null }, {})
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: undefined },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null
            ├─ NumberFromString
            │  └─ Encoded side transformation failure
            │     └─ Expected string, actual undefined
            └─ Expected null, actual undefined`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            └─ Expected null, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    })
  })

  describe(`optional > { exact: true, as: "Option" }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { exact: true, as: "Option" })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectDecodeUnknownFailure(
        schema,
        {
          a: "a"
        },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
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
      const schema = S.Struct({
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
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            └─ Expected null, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
    })
  })

  describe(`optionalToOption > { exact: true, nullable: true, as: "Option", onNoneEncoding: () => O.some(null) }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, {
          exact: true,
          nullable: true,
          as: "Option",
          onNoneEncoding: () => O.some(null)
        })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: null }, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectDecodeUnknownFailure(
        schema,
        {
          a: "a"
        },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            └─ Expected null, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, { a: null })
    })
  })

  describe(`optional > { as: "Option" }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({ a: S.optional(S.NumberFromString, { as: "Option" }) })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectDecodeUnknownFailure(
        schema,
        {
          a: "a"
        },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | undefined
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
    })
  })

  describe(`optional > { nullable: true, as: "Option" }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
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
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null | undefined
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            ├─ Expected null, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
    })
  })

  describe(`optional > { as: "Option", onNoneEncoding: () => O.some(undefined) }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { as: "Option", onNoneEncoding: () => O.some(undefined) })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: O.none() })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: null },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | undefined
            ├─ NumberFromString
            │  └─ Encoded side transformation failure
            │     └─ Expected string, actual null
            └─ Expected undefined, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        {
          a: "a"
        },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | undefined
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, { a: undefined })
    })
  })

  describe(`optional > { nullable: true, as: "Option", onNoneEncoding: () => O.some(undefined) }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { nullable: true, as: "Option", onNoneEncoding: () => O.some(undefined) })
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
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null | undefined
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            ├─ Expected null, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, { a: undefined })
    })
  })

  describe(`optional > { nullable: true, as: "Option", onNoneEncoding: () => O.some(null) }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { nullable: true, as: "Option", onNoneEncoding: () => O.some(null) })
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
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null | undefined
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            ├─ Expected null, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, { a: null })
    })
  })

  describe("optional > { exact: true, default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { exact: true, default: () => 0 })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
    })

    it("should apply the default to the default constructor", () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { exact: true, default: () => 0 })
      })
      expect(schema.make({})).toStrictEqual({ a: 0 })
    })
  })

  describe("optional > { default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { default: () => 0 })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | undefined
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
    })

    it("should apply the default to the default constructor", () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { default: () => 0 })
      })
      expect(schema.make({})).toStrictEqual({ a: 0 })
    })
  })

  describe("optional > { nullable: true, default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { nullable: true, default: () => 0 })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: null }, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null | undefined
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            ├─ Expected null, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
    })

    it("should apply the default to the default constructor", () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { nullable: true, default: () => 0 })
      })
      expect(schema.make({})).toStrictEqual({ a: 0 })
    })
  })

  describe("optional > { exact: true, nullable: true, default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { exact: true, nullable: true, default: () => 0 })
      })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: null }, { a: 0 })
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Expected NumberFromString, actual "a"
            └─ Expected null, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
    })

    it("should apply the default to the default constructor", () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { exact: true, nullable: true, default: () => 0 })
      })
      expect(schema.make({})).toStrictEqual({ a: 0 })
    })
  })
})
