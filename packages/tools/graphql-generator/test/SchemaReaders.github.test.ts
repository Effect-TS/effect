/**
 * Acceptance check for both schema readers (EFF-1829 point 3): the GitHub
 * introspection JSON and the SDL printed from it produce equal models.
 *
 * `schema.json` and `schema.graphql` describe the same snapshot (see
 * `test/fixtures/github/README.md`).
 */
import { describe, it } from "@effect/vitest"
import { assertModelsEqual, fixture, readIntrospection, readSdl } from "./utils/model.ts"

describe("schema readers: GitHub", () => {
  it("the SDL and the introspection JSON produce equal models", () => {
    assertModelsEqual(
      readSdl(fixture("github/schema.graphql"), "github/schema.graphql"),
      readIntrospection(fixture("github/schema.json"), "github/schema.json")
    )
  })
})
