import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { deepStrictEqual } from "effect/test/util"

describe("make", () => {
  it("tag should be optional", () => {
    const schema = S.TaggedStruct("A", { value: S.String })
    deepStrictEqual(schema.make({ value: "a" }), { _tag: "A", value: "a" })
  })

  it("should support empty fields", () => {
    const schema = S.TaggedStruct("A", {})
    deepStrictEqual(schema.make({}), { _tag: "A" })
  })

  it("should expose the fields", () => {
    const schema = S.TaggedStruct("A", { value: S.String })
    Util.expectFields(schema.fields, { _tag: S.tag("A"), value: S.String })
  })

  it("should support multiple tags", () => {
    const schema = S.TaggedStruct("A", { category: S.tag("B"), value: S.String })
    deepStrictEqual(schema.make({ value: "a" }), { _tag: "A", category: "B", value: "a" })
  })
})
