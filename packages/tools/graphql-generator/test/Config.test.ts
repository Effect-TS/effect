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

describe("Config", () => {
  it("the config Schema decodes the documented example", () => {
    assert.deepStrictEqual(Schema.decodeUnknownSync(Config.Config)(example), example)
  })

  it("rejects a scalar specifier without a #", () => {
    const exit = Schema.decodeUnknownExit(Config.Config)({ ...example, scalars: { URI: "./scalars.ts" } })
    assert.isTrue(Exit.isFailure(exit))
  })
})
