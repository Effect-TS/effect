/**
 * The `graphql.config.ts` shape (EFF-1834 points 1, 5, 6 and 7).
 */
import * as Config from "@effect/graphql-generator/Config"
import { assert, describe, it } from "@effect/vitest"
import * as Exit from "effect/Exit"
import * as Schema from "effect/Schema"

const example = {
  schema: "./schema/github.graphql",
  documents: ["src/**/*.graphql"],
  scalars: {
    DateTime: "effect/Schema#DateTimeUtcFromString",
    URI: "./scalars.ts#Uri"
  }
} as const

const decodes = (input: unknown): boolean => Exit.isSuccess(Schema.decodeUnknownExit(Config.Config)(input))

describe("Config", () => {
  it("defineConfig returns its argument unchanged", () => {
    const config = Config.defineConfig(example)
    assert.strictEqual(config, example)
  })

  it("the config Schema decodes the documented example", () => {
    assert.deepStrictEqual(Schema.decodeUnknownSync(Config.Config)(example), example)
  })

  it("accepts the shared module path and every importExtension", () => {
    for (const importExtension of [".ts", ".js", ""]) {
      assert.isTrue(decodes({ ...example, shared: "./src/shared.graphql.ts", importExtension }), importExtension)
    }
  })

  it("rejects any other importExtension", () => {
    assert.isFalse(decodes({ ...example, importExtension: ".mjs" }))
  })

  it("rejects a scalar specifier without a #", () => {
    assert.isFalse(decodes({ ...example, scalars: { URI: "./scalars.ts" } }))
  })

  it("requires schema and documents", () => {
    assert.isFalse(decodes({ documents: example.documents }))
    assert.isFalse(decodes({ schema: example.schema }))
  })
})
