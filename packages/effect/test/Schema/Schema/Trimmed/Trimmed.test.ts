import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import { Option, Predicate } from "effect"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../../TestUtils.js"

describe("Trimmed", () => {
  const schema = S.Trimmed

  it("pattern in JSONSchemaAnnotation", () => {
    const annotation = AST.getJSONSchemaAnnotation(schema.ast)
    if (Option.isSome(annotation) && "pattern" in annotation.value && Predicate.isString(annotation.value.pattern)) {
      const regexp = new RegExp(annotation.value.pattern)
      const is = (s: string) => regexp.test(s)
      assertTrue(is("hello"))
      assertFalse(is(" hello"))
      assertFalse(is("hello "))
      assertFalse(is(" hello "))
      assertTrue(is("h"))
      assertFalse(is(" a b"))
      assertFalse(is("a b "))
      assertTrue(is("a b"))
      assertTrue(is("a  b"))
      assertTrue(is(""))
      assertFalse(is("\n"))
      assertTrue(is("a\nb"))
      assertFalse(is("a\nb "))
      assertFalse(is(" a\nb"))
    }
  })

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    assertTrue(is("a"))
    assertTrue(is(""))
    assertFalse(is("a "))
    assertFalse(is(" a"))
    assertFalse(is(" a "))
    assertFalse(is(" "))
    assertFalse(is("\n"))
    assertTrue(is("a\nb"))
    assertFalse(is("a\nb "))
    assertFalse(is(" a\nb"))
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, "a")
    await Util.assertions.decoding.succeed(schema, "")
    await Util.assertions.decoding.fail(
      schema,
      "a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected a string with no leading or trailing whitespace, actual "a "`
    )
    await Util.assertions.decoding.fail(
      schema,
      " a",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected a string with no leading or trailing whitespace, actual " a"`
    )
    await Util.assertions.decoding.fail(
      schema,
      " a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected a string with no leading or trailing whitespace, actual " a "`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, "a", "a")
    await Util.assertions.encoding.succeed(schema, "", "")
    await Util.assertions.encoding.fail(
      schema,
      "a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected a string with no leading or trailing whitespace, actual "a "`
    )
    await Util.assertions.encoding.fail(
      schema,
      " a",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected a string with no leading or trailing whitespace, actual " a"`
    )
    await Util.assertions.encoding.fail(
      schema,
      " a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected a string with no leading or trailing whitespace, actual " a "`
    )
  })

  it("pretty", () => {
    Util.assertions.pretty(schema, "a", `"a"`)
    Util.assertions.pretty(schema, "", `""`)
  })
})
