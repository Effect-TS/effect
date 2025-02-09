import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("make", () => {
  it("tag should be optional", () => {
    const schema = S.TaggedStruct("A", { value: S.String })
    expect(schema.make({ value: "a" })).toStrictEqual({ _tag: "A", value: "a" })
  })

  it("should support empty fields", () => {
    const schema = S.TaggedStruct("A", {})
    expect(schema.make({})).toStrictEqual({ _tag: "A" })
  })

  it("should expose the fields", () => {
    const schema = S.TaggedStruct("A", { value: S.String })
    Util.expectFields(schema.fields, { _tag: S.tag("A"), value: S.String })
  })

  it("should support multiple tags", () => {
    const schema = S.TaggedStruct("A", { category: S.tag("B"), value: S.String })
    expect(schema.make({ value: "a" })).toStrictEqual({ _tag: "A", category: "B", value: "a" })
  })
})
