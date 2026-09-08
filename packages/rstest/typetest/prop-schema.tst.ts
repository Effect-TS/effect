import { type EffectTest, it, type Vitest } from "@effect/rstest"
import { Effect, Schema } from "effect"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"
import { describe, expect, test } from "tstyche"

describe("schema properties", () => {
  test("plain tuple inputs infer schema and arbitrary values", () => {
    it.prop("tuple", [Schema.Literal("schema"), Arbitrary.schema(Schema.Int)], ([label, count]) => {
      expect(label).type.toBe<"schema">()
      expect(count).type.toBe<number>()
    })
  })

  test("plain record inputs infer schema and arbitrary values", () => {
    it.prop("record", { label: Schema.Literal("schema"), count: Arbitrary.schema(Schema.Int) }, ({ label, count }) => {
      expect(label).type.toBe<"schema">()
      expect(count).type.toBe<number>()
    })
  })

  test("effect tests accept non-void success values", () => {
    expect(it.effect).type.toBeCallableWith("non-void", () => Effect.succeed(false))
    expect(it.live).type.toBeCallableWith("non-void", () => Effect.succeed(42))
  })
})

test("neutral namespace retains compatibility", () => {
  expect<EffectTest.Methods>().type.toBe<Vitest.Methods>()
  expect<EffectTest.Tester<never>>().type.toBe<Vitest.Tester<never>>()
})
