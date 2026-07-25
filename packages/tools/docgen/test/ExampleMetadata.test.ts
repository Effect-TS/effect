import * as ExampleMetadata from "@effect/docgen/ExampleMetadata"
import { assert, describe, it } from "@effect/vitest"

const metadata: ExampleMetadata.ExampleMetadata = {
  name: "effect/Array.map example 1",
  packageName: "effect",
  sourcePath: "packages/effect/src/Array.ts",
  declaration: "map",
  index: 1
}

describe("ExampleMetadata", () => {
  it("encodes and decodes a structured header", () => {
    const header = ExampleMetadata.encode(metadata)

    assert.strictEqual(
      header,
      "// @effect/docgen-example {\"name\":\"effect/Array.map example 1\",\"packageName\":\"effect\",\"sourcePath\":\"packages/effect/src/Array.ts\",\"declaration\":\"map\",\"index\":1}"
    )
    assert.deepStrictEqual(ExampleMetadata.decode(`${header}\nexport const value = 1`), metadata)
  })

  it("rejects missing metadata", () => {
    assert.throws(() => ExampleMetadata.decode("export const value = 1"), /missing.*metadata header/)
  })

  it("rejects malformed metadata", () => {
    assert.throws(
      () => ExampleMetadata.decode("// @effect/docgen-example {not-json}"),
      /invalid.*metadata header/
    )
    assert.throws(
      () => ExampleMetadata.decode("// @effect/docgen-example {\"name\":\"example\"}"),
      /packageName.*non-empty string/
    )
  })
})
