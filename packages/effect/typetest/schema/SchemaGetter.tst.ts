import type { Effect, Option, SchemaIssue } from "effect"
import { SchemaGetter, SchemaTransformation } from "effect"
import { describe, expect, it } from "tstyche"

describe("SchemaGetter", () => {
  it("map", () => {
    const getter = null as unknown as SchemaGetter.Getter<number, string, "R">

    expect(SchemaGetter.map(getter, String)).type.toBe<SchemaGetter.Getter<string, string, "R">>()
    expect(SchemaGetter.map(String)(getter)).type.toBe<SchemaGetter.Getter<string, string, "R">>()
  })

  it("compose", () => {
    const first = null as unknown as SchemaGetter.Getter<number, string, "R1">
    const second = null as unknown as SchemaGetter.Getter<boolean, number, "R2">

    expect(SchemaGetter.compose(first, second)).type.toBe<SchemaGetter.Getter<boolean, string, "R1" | "R2">>()
    expect(SchemaGetter.compose(second)(first)).type.toBe<SchemaGetter.Getter<boolean, string, "R1" | "R2">>()
  })

  it("run", () => {
    const getter = null as unknown as SchemaGetter.Getter<number, string, "R">
    const input = null as unknown as Option.Option<string>

    expect(SchemaGetter.run(getter, input, {})).type.toBe<
      Effect.Effect<Option.Option<number>, SchemaIssue.Issue, "R">
    >()
    expect(SchemaGetter.run(input, {})(getter)).type.toBe<
      Effect.Effect<Option.Option<number>, SchemaIssue.Issue, "R">
    >()
  })
})

describe("SchemaTransformation", () => {
  it("compose", () => {
    const first = null as unknown as SchemaTransformation.Transformation<number, string, "RD1", "RE1">
    const second = null as unknown as SchemaTransformation.Transformation<boolean, number, "RD2", "RE2">

    expect(SchemaTransformation.compose(first, second)).type.toBe<
      SchemaTransformation.Transformation<boolean, string, "RD1" | "RD2", "RE1" | "RE2">
    >()
    expect(SchemaTransformation.compose(second)(first)).type.toBe<
      SchemaTransformation.Transformation<boolean, string, "RD1" | "RD2", "RE1" | "RE2">
    >()
  })
})
