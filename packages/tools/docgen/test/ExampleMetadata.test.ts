import * as ExampleMetadata from "@effect/docgen/ExampleMetadata"
import { assert, describe, it } from "@effect/vitest"

describe("ExampleMetadata", () => {
  it("projects runner metadata from semantic examples", () => {
    assert.deepStrictEqual(
      ExampleMetadata.fromExample({
        name: "effect/Array.map example 1",
        packageName: "effect",
        sourcePath: "packages/effect/src/Array.ts",
        declarationPath: ["Array", "map"],
        declarationKind: "staticMethod",
        index: 1
      }),
      {
        name: "effect/Array.map example 1",
        packageName: "effect",
        sourcePath: "packages/effect/src/Array.ts",
        declaration: "Array.static.map",
        index: 1
      }
    )
  })
})
