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
      await Util.expectParseSuccess(schema, {}, {})
      await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `/a Expected string <-> number, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    })

    it("never", async () => {
      const schema = S.struct({ a: S.optional(S.never, { exact: true }), b: S.number })
      await Util.expectParseSuccess(schema, { b: 1 })
      await Util.expectParseFailure(schema, { a: "a", b: 1 }, `/a Expected never, actual "a"`)
    })
  })

  describe("optional", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString)
      })
      await Util.expectParseSuccess(schema, {}, {})
      await Util.expectParseSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `/a union member: Expected undefined, actual "a", union member: Expected string <-> number, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    })
  })

  describe("optional > { exact: true, as: \"Option\" }", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { exact: true, as: "Option" })
      })
      await Util.expectParseSuccess(schema, {}, { a: O.none() })
      await Util.expectParseSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectParseFailure(schema, {
        a: "a"
      }, `/a Expected string <-> number, actual "a"`)

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
    })
  })

  describe("optionalToOption > { exact: true, nullable: true, as: \"Option\" }", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { exact: true, nullable: true, as: "Option" })
      })
      await Util.expectParseSuccess(schema, {}, { a: O.none() })
      await Util.expectParseSuccess(schema, { a: null }, { a: O.none() })
      await Util.expectParseSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectParseFailure(
        schema,
        {
          a: "a"
        },
        `/a union member: Expected null, actual "a", union member: Expected string <-> number, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
    })
  })

  describe("optional > { as: \"Option\" }", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({ a: S.optional(S.NumberFromString, { as: "Option" }) })
      await Util.expectParseSuccess(schema, {}, { a: O.none() })
      await Util.expectParseSuccess(schema, { a: undefined }, { a: O.none() })
      await Util.expectParseSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectParseFailure(
        schema,
        {
          a: "a"
        },
        `/a union member: Expected undefined, actual "a", union member: Expected string <-> number, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
    })
  })

  describe("optional > { nullable: true, as: \"Option\" }", () => {
    it("decoding / encoding", async () => {
      const schema = S.struct({
        a: S.optional(S.NumberFromString, { nullable: true, as: "Option" })
      })
      await Util.expectParseSuccess(schema, {}, { a: O.none() })
      await Util.expectParseSuccess(schema, { a: undefined }, { a: O.none() })
      await Util.expectParseSuccess(schema, { a: null }, { a: O.none() })
      await Util.expectParseSuccess(schema, { a: "1" }, { a: O.some(1) })
      await Util.expectParseFailure(
        schema,
        {
          a: "a"
        },
        `/a union member: Expected null, actual "a", union member: Expected undefined, actual "a", union member: Expected string <-> number, actual "a"`
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
      await Util.expectParseSuccess(schema, {}, { a: 0 })
      await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `/a Expected string <-> number, actual "a"`
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
      await Util.expectParseSuccess(schema, {}, { a: 0 })
      await Util.expectParseSuccess(schema, { a: undefined }, { a: 0 })
      await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `/a union member: Expected undefined, actual "a", union member: Expected string <-> number, actual "a"`
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
      await Util.expectParseSuccess(schema, {}, { a: 0 })
      await Util.expectParseSuccess(schema, { a: null }, { a: 0 })
      await Util.expectParseSuccess(schema, { a: undefined }, { a: 0 })
      await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `/a union member: Expected null, actual "a", union member: Expected undefined, actual "a", union member: Expected string <-> number, actual "a"`
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
      await Util.expectParseSuccess(schema, {}, { a: 0 })
      await Util.expectParseSuccess(schema, { a: null }, { a: 0 })
      await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `/a union member: Expected null, actual "a", union member: Expected string <-> number, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
      await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
    })
  })
})
