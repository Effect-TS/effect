import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { cacheProof, entity, extract, MainLayer, pair } from "./SnapshotFixtures.ts"

const cases = [
  ["number-to-string", "1", "\"1\"", true],
  ["string-to-number", "\"1\"", "1", true],
  ["numeric-value", "1", "2", true],
  ["quote-equivalence", "\"1\"", "'1'", false],
  ["escape-equivalence", "\"1\"", "\"\\u0031\"", false],
  ["bigint-to-string", "1n", "\"1n\"", true],
  ["bigint-value", "1n", "2n", true],
  ["bigint-to-number", "1n", "1", true],
  ["bigint-separator-equivalence", "1_000n", "1000n", false],
  ["null-to-string", "null", "\"null\"", true],
  ["true-to-string", "true", "\"true\"", true],
  ["false-to-string", "false", "\"false\"", true],
  ["boolean-value", "true", "false", true],
  ["negative-number-to-string", "-1", "\"-1\"", true],
  ["negative-bigint-to-string", "-1n", "\"-1n\"", true],
  ["negative-spacing-equivalence", "-1", "- 1", false],
  ["negative-bigint-spacing-equivalence", "-1n", "- 1n", false],
  ["different-roots", "\"same\"", "\"same\"", false],
  ["null-identity", "null", "null", false]
] as const

describe("literal category canonical extraction", () => {
  for (const [name, before, after, changed] of cases) {
    it.effect(name, () =>
      Effect.gen(function*() {
        const { base, head, diff } = yield* pair(
          `export type Value = ${before}\n`,
          `export type Value = ${after}\n`
        )
        const left = entity(base, "Value")
        const right = entity(head, "Value")
        assert.strictEqual(left.fingerprint !== right.fingerprint, changed)
        assert.deepStrictEqual(
          diff.changes.map((change) => ({
            classification: change.classification,
            baseApiId: change.baseApiId,
            headApiId: change.headApiId,
            authoritative: change.authoritative
          })),
          changed ?
            [{
              classification: "structural-change",
              baseApiId: left.id,
              headApiId: right.id,
              authoritative: true
            }] :
            []
        )
      }).pipe(Effect.provide(MainLayer)))
  }

  it.effect("exact JSON-safe models", () =>
    Effect.gen(function*() {
      const snapshot = yield* extract(`
export type NumberValue = 1
export type StringValue = "1"
export type BigintValue = 1n
export type NullValue = null
export type TrueValue = true
export type FalseValue = false
export type NegativeNumberValue = -1
export type NegativeBigintValue = -1n
`)
      for (
        const [name, literalKind, value] of [
          ["NumberValue", "number", "1"],
          ["StringValue", "string", "1"],
          ["BigintValue", "bigint", "1n"],
          ["NullValue", "null", "null"],
          ["TrueValue", "boolean", true],
          ["FalseValue", "boolean", false],
          ["NegativeNumberValue", "number", "-1"],
          ["NegativeBigintValue", "bigint", "-1n"]
        ] as const
      ) {
        assert.deepStrictEqual(entity(snapshot, name).declarations[0]?.type, { kind: "literal", literalKind, value })
      }
      assert.deepStrictEqual(JSON.parse(JSON.stringify(snapshot)).entities.length, 8)
    }).pipe(Effect.provide(MainLayer)))

  it.effect("preserves the legacy null scalar through JSON serialization", () =>
    Effect.gen(function*() {
      const snapshot = yield* extract("export type NullValue = null\n")
      const type = entity(snapshot, "NullValue").declarations[0]?.type
      // Category is asserted by the exact models and null-to-string tests above.
      assert.strictEqual(type?.kind, "literal")
      assert.strictEqual(type?.value, "null")
      assert.strictEqual(JSON.parse(JSON.stringify(type)).value, "null")
    }).pipe(Effect.provide(MainLayer)))

  it.effect("invalidates only the owned snapshot-v4 fixture cache", () =>
    cacheProof(
      "literal-type-category-v1",
      "class-member-optionality-v1",
      "export type Value = 1\n"
    ).pipe(Effect.provide(MainLayer)))
})
