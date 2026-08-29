import { assert, describe, it } from "@effect/vitest"
import * as testAssert from "@effect/vitest/utils"
import { Context, Effect, Schema, SchemaGetter, SchemaIssue } from "effect"
import * as SchemaTransformation from "effect/SchemaTransformation"
import { TestSchema } from "effect/testing"

describe("TestSchema", () => {
  it("decoding", async () => {
    const schema = Schema.FiniteFromString.check(Schema.isGreaterThan(0))
    const asserts = new TestSchema.Asserts(schema)
    const decoding = asserts.decoding()
    await decoding.succeed("1", 1)
    await decoding.fail("-1", `Expected a value greater than 0`)
    await decoding.fail("a", `Expected a finite number`)
  })

  it("decoding.provide", async () => {
    class Service extends Context.Service<Service, { fallback: Effect.Effect<string> }>()("Service") {}

    const schema = Schema.String.pipe(
      Schema.decode({
        decode: SchemaGetter.checkEffect((s) =>
          Effect.gen(function*() {
            yield* Service
            if (s.length === 0) {
              return new SchemaIssue.InvalidValue({
                message: "input should not be empty string"
              })
            }
          })
        ),
        encode: SchemaGetter.passthrough()
      })
    )
    const asserts = new TestSchema.Asserts(schema)

    const decoding = asserts.decoding().provide(Service, { fallback: Effect.succeed("b") })
    await decoding.succeed("a")
    await decoding.fail("", "input should not be empty string")
  })

  it("encoding", async () => {
    const schema = Schema.FiniteFromString.check(Schema.isGreaterThan(0))
    const asserts = new TestSchema.Asserts(schema)
    const encoding = asserts.encoding()
    await encoding.succeed(1, "1")
    await encoding.fail(-1, `Expected a value greater than 0`)
  })

  it("encoding.provide", async () => {
    class Service extends Context.Service<Service, { fallback: Effect.Effect<string> }>()("Service") {}

    const schema = Schema.String.pipe(
      Schema.decode({
        decode: SchemaGetter.passthrough(),
        encode: SchemaGetter.checkEffect((s) =>
          Effect.gen(function*() {
            yield* Service
            if (s.length === 0) {
              return new SchemaIssue.InvalidValue({
                message: "input should not be empty string"
              })
            }
          })
        )
      })
    )
    const asserts = new TestSchema.Asserts(schema)

    const encoding = asserts.encoding().provide(Service, { fallback: Effect.succeed("b") })
    await encoding.succeed("a")
    await encoding.fail("", "input should not be empty string")
  })

  it("verifyLosslessTransformation", async () => {
    const schema = Schema.FiniteFromString.check(Schema.isGreaterThan(0))
    const asserts = new TestSchema.Asserts(schema)
    await asserts.verifyLosslessTransformation({ runs: 20, seed: "lossless" })
  })

  it("verifyLosslessTransformation reports a shrunk input and replay", async () => {
    const schema = Schema.Number.pipe(
      Schema.decodeTo(
        Schema.Number,
        SchemaTransformation.transform({ decode: (value) => value, encode: () => 0 })
      )
    )
    const asserts = new TestSchema.Asserts(schema)

    await testAssert.throwsAsync(
      () => asserts.verifyLosslessTransformation({ runs: 20, seed: "lossy" }),
      (error) => {
        assert.instanceOf(error, Error)
        assert.match(error.message, /Property falsified/)
        assert.match(error.message, /Shrunk input:/)
        assert.match(error.message, /Replay:/)
      }
    )
  })

  it("verifyGeneration bounds residual discards", () => {
    const schema = Schema.Null.check(Schema.makeFilter(() => false))
    const asserts = new TestSchema.Asserts(schema)

    assert.throws(
      () => asserts.arbitrary().verifyGeneration({ runs: 1, maxDiscards: 2, seed: "exhausted" }),
      /Property exhausted after 0 run\(s\) and 3 discard\(s\)/
    )
  })
})
