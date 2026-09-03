import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { cacheProof, entity, extract, MainLayer, pair } from "./SnapshotFixtures.ts"

const cases = [
  ["property-required-to-optional", "class", "value: string", "value?: string", true],
  ["property-optional-to-required", "class", "value?: string", "value: string", true],
  ["method-required-to-optional", "class", "run(): void", "run?(): void", true],
  ["method-optional-to-required", "class", "run?(): void", "run(): void", true],
  ["interface-property-required-to-optional", "interface", "value: string", "value?: string", true],
  ["interface-property-optional-to-required", "interface", "value?: string", "value: string", true],
  ["interface-method-required-to-optional", "interface", "run(): void", "run?(): void", true],
  ["interface-method-optional-to-required", "interface", "run?(): void", "run(): void", true],
  ["optional-property-type", "class", "value?: string", "value?: number", true],
  ["different-roots", "class", "value?: string; run?(): void", "value?: string; run?(): void", false],
  ["private-property-exclusion", "class", "private value: string", "private value?: number", false],
  ["private-method-exclusion", "class", "private run(): string", "private run?(): number", false],
  ["visibility-control", "class", "public value?: string", "protected value?: string", true],
  ["static-property-control", "class", "value?: string", "static value?: string", true],
  ["static-method-control", "class", "run?(): void", "static run?(): void", true],
  ["readonly-control", "class", "value?: string", "readonly value?: string", true],
  ["protected-optionality", "class", "protected value: string", "protected value?: string", true],
  ["static-readonly-optionality", "class", "static readonly value: string", "static readonly value?: string", true],
  ["static-method-optionality", "class", "static run(): void", "static run?(): void", true],
  ["required-undefined-union", "class", "value: string | undefined", "value?: string | undefined", true],
  ["optional-versus-required-undefined", "class", "value?: string", "value: string | undefined", true],
  ["method-parameter-control", "class", "run(value: string): void", "run(value?: string): void", true]
] as const

describe("class optionality canonical extraction", () => {
  for (const [name, kind, before, after, changed] of cases) {
    it.effect(name, () =>
      Effect.gen(function*() {
        const prefix = kind === "class" ? "export declare class" : "export interface"
        const { base, head, diff } = yield* pair(
          `${prefix} Client { ${before} }\n`,
          `${prefix} Client { ${after} }\n`
        )
        const buckets = kind === "class" ? ["type", "value"] : ["type"]
        assert.deepStrictEqual(base.entities.map((entity) => entity.bucket), buckets)
        assert.deepStrictEqual(head.entities.map((entity) => entity.bucket), buckets)
        for (const bucket of buckets) {
          const left = entity(base, "Client", bucket)
          const right = entity(head, "Client", bucket)
          assert.strictEqual(left.fingerprint !== right.fingerprint, changed)
        }
        assert.deepStrictEqual(
          diff.changes.map((change) => ({
            classification: change.classification,
            baseApiId: change.baseApiId,
            headApiId: change.headApiId,
            authoritative: change.authoritative
          })),
          changed ?
            buckets.map((bucket) => ({
              classification: "member-changed" as const,
              baseApiId: `@fixture/sample/Api#Client#${bucket}`,
              headApiId: `@fixture/sample/Api#Client#${bucket}`,
              authoritative: true
            })) :
            []
        )
      }).pipe(Effect.provide(MainLayer)))
  }

  it.effect("preserves exact optional visibility static readonly and private conventions", () =>
    Effect.gen(function*() {
      const snapshot = yield* extract(`export declare class Client {
  public readonly value?: string
  protected run?(): void
  static readonly count?: number
  public static start?(): void
  required: string | undefined
  public requiredRun(): void
  private hidden?: string
  private secret?(): void
}`)
      for (const bucket of ["type", "value"]) {
        const members = entity(snapshot, "Client", bucket).declarations[0]?.members
        assert(members !== undefined)
        assert.deepStrictEqual(members.map((member) => member.name), [
          "requiredRun",
          "run",
          "start",
          "count",
          "required",
          "value"
        ])
        const modifiers = Object.fromEntries(members.map((member) => [member.name, member.modifiers]))
        assert.deepStrictEqual(modifiers, {
          requiredRun: ["public"],
          run: ["optional", "protected"],
          start: ["optional", "public", "static"],
          count: ["optional", "readonly", "static"],
          required: undefined,
          value: ["optional", "public", "readonly"]
        })
        assert.deepStrictEqual(members.find((member) => member.name === "required")?.type, {
          kind: "union",
          members: [{ kind: "primitive", name: "string" }, { kind: "primitive", name: "undefined" }]
        })
      }
    }).pipe(Effect.provide(MainLayer)))

  it.effect("invalidates only the owned snapshot-v4 fixture cache", () =>
    cacheProof(
      "class-member-optionality-v1",
      "literal-type-category-v1",
      "export declare class Client { value?: string; run?(): void }\n"
    ).pipe(Effect.provide(MainLayer)))
})
