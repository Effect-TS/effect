import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as O from "effect/Option"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../TestUtils.js"

describe("optionalWith", () => {
  it("annotations", async () => {
    const schema = S.Struct({
      a: S.optionalWith(S.NumberFromString, {
        exact: true
      }).annotations({ description: "my description" })
    })
    deepStrictEqual((schema.ast as any).propertySignatures[0].annotations, {
      [AST.DescriptionAnnotationId]: "my description"
    })
  })

  describe("{ exact: true }", () => {
    it("should expose a from property", () => {
      const schema = S.optionalWith(S.String, { exact: true })
      strictEqual(schema.from, S.String)
    })

    it("should expose a from property after an annotations call", () => {
      const schema = S.optionalWith(S.String, { exact: true }).annotations({})
      strictEqual(schema.from, S.String)
    })

    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { exact: true })
      })
      await Util.assertions.decoding.succeed(schema, {}, {})
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `{ readonly a?: NumberFromString }
└─ ["a"]
   └─ NumberFromString
      └─ Transformation process failure
         └─ Unable to decode "a" into a number`
      )

      await Util.assertions.encoding.succeed(schema, {}, {})
      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: "1" })
    })

    it("never", async () => {
      strictEqual(S.optionalWith(S.Never, { exact: true }).from.ast, AST.neverKeyword)
      const schema = S.Struct({ a: S.optionalWith(S.Never, { exact: true }), b: S.Number })
      await Util.assertions.decoding.succeed(schema, { b: 1 })
      await Util.assertions.decoding.fail(
        schema,
        { a: "a", b: 1 },
        `{ readonly a?: never; readonly b: number }
└─ ["a"]
   └─ Expected never, actual "a"`
      )
    })
  })

  describe("{ nullable: true }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { nullable: true })
      })
      await Util.assertions.decoding.succeed(schema, {}, {})
      await Util.assertions.decoding.succeed(schema, { a: undefined }, { a: undefined })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
      await Util.assertions.decoding.succeed(schema, { a: null }, {})
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null | undefined
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Unable to decode "a" into a number
            ├─ Expected null, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, {}, {})
      await Util.assertions.encoding.succeed(schema, { a: undefined }, { a: undefined })
      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: "1" })
    })
  })

  describe("{ exact: true, nullable: true }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true })
      })
      await Util.assertions.decoding.succeed(schema, {}, {})
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
      await Util.assertions.decoding.succeed(schema, { a: null }, {})
      await Util.assertions.decoding.fail(
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
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Unable to decode "a" into a number
            └─ Expected null, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, {}, {})
      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: "1" })
    })
  })

  describe(`optionalWith > { exact: true, as: "Option" }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { exact: true, as: "Option" })
      })
      await Util.assertions.decoding.succeed(schema, {}, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: O.some(1) })
      await Util.assertions.decoding.fail(
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
               └─ Unable to decode "a" into a number`
      )

      await Util.assertions.encoding.succeed(schema, { a: O.some(1) }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: O.none() }, {})
    })
  })

  describe(`optionalWith > { exact: true, nullable: true, as: "Option" }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, as: "Option" })
      })
      await Util.assertions.decoding.succeed(schema, {}, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: null }, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: O.some(1) })
      await Util.assertions.decoding.fail(
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
            │     └─ Unable to decode "a" into a number
            └─ Expected null, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, { a: O.some(1) }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: O.none() }, {})
    })
  })

  describe(`optionalWith > { exact: true, nullable: true, as: "Option", onNoneEncoding: () => O.some(null) }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, {
          exact: true,
          nullable: true,
          as: "Option",
          onNoneEncoding: () => O.some(null)
        })
      })
      await Util.assertions.decoding.succeed(schema, {}, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: null }, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: O.some(1) })
      await Util.assertions.decoding.fail(
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
            │     └─ Unable to decode "a" into a number
            └─ Expected null, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, { a: O.some(1) }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: O.none() }, { a: null })
    })
  })

  describe(`optionalWith > { as: "Option" }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({ a: S.optionalWith(S.NumberFromString, { as: "Option" }) })
      await Util.assertions.decoding.succeed(schema, {}, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: undefined }, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: O.some(1) })
      await Util.assertions.decoding.fail(
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
            │     └─ Unable to decode "a" into a number
            └─ Expected undefined, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, { a: O.some(1) }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: O.none() }, {})
    })
  })

  describe(`optionalWith > { nullable: true, as: "Option" }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { nullable: true, as: "Option" })
      })
      await Util.assertions.decoding.succeed(schema, {}, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: undefined }, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: null }, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: O.some(1) })
      await Util.assertions.decoding.fail(
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
            │     └─ Unable to decode "a" into a number
            ├─ Expected null, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, { a: O.some(1) }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: O.none() }, {})
    })
  })

  describe(`optionalWith > { as: "Option", onNoneEncoding: () => O.some(undefined) }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { as: "Option", onNoneEncoding: () => O.some(undefined) })
      })
      await Util.assertions.decoding.succeed(schema, {}, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: undefined }, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: O.some(1) })
      await Util.assertions.decoding.fail(
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
      await Util.assertions.decoding.fail(
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
            │     └─ Unable to decode "a" into a number
            └─ Expected undefined, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, { a: O.some(1) }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: O.none() }, { a: undefined })
    })
  })

  describe(`optionalWith > { nullable: true, as: "Option", onNoneEncoding: () => O.some(undefined) }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { nullable: true, as: "Option", onNoneEncoding: () => O.some(undefined) })
      })
      await Util.assertions.decoding.succeed(schema, {}, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: undefined }, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: null }, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: O.some(1) })
      await Util.assertions.decoding.fail(
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
            │     └─ Unable to decode "a" into a number
            ├─ Expected null, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, { a: O.some(1) }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: O.none() }, { a: undefined })
    })
  })

  describe(`optionalWith > { nullable: true, as: "Option", onNoneEncoding: () => O.some(null) }`, () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { nullable: true, as: "Option", onNoneEncoding: () => O.some(null) })
      })
      await Util.assertions.decoding.succeed(schema, {}, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: undefined }, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: null }, { a: O.none() })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: O.some(1) })
      await Util.assertions.decoding.fail(
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
            │     └─ Unable to decode "a" into a number
            ├─ Expected null, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, { a: O.some(1) }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: O.none() }, { a: null })
    })
  })

  describe("{ exact: true, default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { exact: true, default: () => 0 })
      })
      await Util.assertions.decoding.succeed(schema, {}, { a: 0 })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Unable to decode "a" into a number`
      )

      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: 0 }, { a: "0" })
    })

    it("should apply the default to the default constructor", () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { exact: true, default: () => 0 })
      })
      deepStrictEqual(schema.make({}), { a: 0 })
    })
  })

  describe("{ default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { default: () => 0 })
      })
      await Util.assertions.decoding.succeed(schema, {}, { a: 0 })
      await Util.assertions.decoding.succeed(schema, { a: undefined }, { a: 0 })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | undefined
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Unable to decode "a" into a number
            └─ Expected undefined, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: 0 }, { a: "0" })
    })

    it("should apply the default to the default constructor", () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { default: () => 0 })
      })
      deepStrictEqual(schema.make({}), { a: 0 })
    })
  })

  describe("{ nullable: true, default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { nullable: true, default: () => 0 })
      })
      await Util.assertions.decoding.succeed(schema, {}, { a: 0 })
      await Util.assertions.decoding.succeed(schema, { a: null }, { a: 0 })
      await Util.assertions.decoding.succeed(schema, { a: undefined }, { a: 0 })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null | undefined
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Unable to decode "a" into a number
            ├─ Expected null, actual "a"
            └─ Expected undefined, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: 0 }, { a: "0" })
    })

    it("should apply the default to the default constructor", () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { nullable: true, default: () => 0 })
      })
      deepStrictEqual(schema.make({}), { a: 0 })
    })
  })

  describe("{ exact: true, nullable: true, default: () => A }", () => {
    it("decoding / encoding", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 })
      })
      await Util.assertions.decoding.succeed(schema, {}, { a: 0 })
      await Util.assertions.decoding.succeed(schema, { a: null }, { a: 0 })
      await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString | null
            ├─ NumberFromString
            │  └─ Transformation process failure
            │     └─ Unable to decode "a" into a number
            └─ Expected null, actual "a"`
      )

      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: "1" })
      await Util.assertions.encoding.succeed(schema, { a: 0 }, { a: "0" })
    })

    it("should apply the default to the default constructor", () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { exact: true, nullable: true, default: () => 0 })
      })
      deepStrictEqual(schema.make({}), { a: 0 })
    })
  })
})
