import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { Option, Predicate } from "effect"
import { describe, expect, it } from "vitest"

describe("Trimmed", () => {
  const schema = S.Trimmed

  it("pattern in JSONSchemaAnnotation", () => {
    const annotation = AST.getJSONSchemaAnnotation(schema.ast)
    if (Option.isSome(annotation) && "pattern" in annotation.value && Predicate.isString(annotation.value.pattern)) {
      const regexp = new RegExp(annotation.value.pattern)
      const is = (s: string) => regexp.test(s)
      expect(is("hello")).toBe(true)
      expect(is(" hello")).toBe(false)
      expect(is("hello ")).toBe(false)
      expect(is(" hello ")).toBe(false)
      expect(is("h")).toBe(true)
      expect(is(" a b")).toBe(false)
      expect(is("a b ")).toBe(false)
      expect(is("a b")).toBe(true)
      expect(is("a  b")).toBe(true)
      expect(is("")).toBe(true)
      expect(is("\n")).toEqual(false)
      expect(is("a\nb")).toEqual(true)
      expect(is("a\nb ")).toEqual(false)
      expect(is(" a\nb")).toEqual(false)
    }
  })

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    expect(is("a")).toEqual(true)
    expect(is("")).toEqual(true)
    expect(is("a ")).toEqual(false)
    expect(is(" a")).toEqual(false)
    expect(is(" a ")).toEqual(false)
    expect(is(" ")).toEqual(false)
    expect(is("\n")).toEqual(false)
    expect(is("a\nb")).toEqual(true)
    expect(is("a\nb ")).toEqual(false)
    expect(is(" a\nb")).toEqual(false)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, "")
    await Util.expectDecodeUnknownFailure(
      schema,
      "a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed, actual "a "`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      " a",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed, actual " a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      " a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed, actual " a "`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, "a", "a")
    await Util.expectEncodeSuccess(schema, "", "")
    await Util.expectEncodeFailure(
      schema,
      "a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed, actual "a "`
    )
    await Util.expectEncodeFailure(
      schema,
      " a",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed, actual " a"`
    )
    await Util.expectEncodeFailure(
      schema,
      " a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed, actual " a "`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty("a")).toEqual(`"a"`)
    expect(pretty("")).toEqual(`""`)
  })
})
