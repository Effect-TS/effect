import * as SourceExamples from "@effect/docgen/SourceExamples"
import { assert, describe, it } from "@effect/vitest"

const extract = (source: string) =>
  SourceExamples.extract({
    file: "/workspace/packages/example/src/Module.ts",
    source,
    packageName: "@effect/example",
    packageRoot: "/workspace/packages/example",
    workspaceRoot: "/workspace"
  })

describe("SourceExamples", () => {
  it("extracts examples from non-exported declarations", () => {
    const examples = extract(`
/**
 * Internal helper.
 *
 * **Example** (Using the helper)
 *
 * \`\`\`ts
 * const value = helper()
 * \`\`\`
 *
 * @internal
 */
const helper = () => 1
`)

    assert.strictEqual(examples.length, 1)
    assert.strictEqual(examples[0]?.name, "@effect/example/Module.helper example 1")
    assert.strictEqual(examples[0]?.source, "const value = helper()")
  })

  it("uses exported alias and class method names", () => {
    const examples = extract(`
const let_ = () => []

export {
  /**
   * **Example** (Using let)
   *
   * \`\`\`ts
   * const result = 1
   * \`\`\`
   */
  let_ as let
}

class Service {
  /**
   * **Example** (Calling a method)
   *
   * \`\`\`ts
   * const result = Service.make()
   * \`\`\`
   */
  static make() {}
}
`)

    assert.deepStrictEqual(examples.map((example) => example.name), [
      "@effect/example/Module.let example 1",
      "@effect/example/Module.Service.make example 1"
    ])
    assert.deepStrictEqual(examples.map((example) => example.declarationKind), ["export", "staticMethod"])
  })

  it("skips examples marked skip-type-checking", () => {
    const examples = extract(`
/**
 * **Example** (Skipped)
 *
 * \`\`\`ts skip-type-checking
 * missing()
 * \`\`\`
 */
const value = 1
`)

    assert.isEmpty(examples)
  })

  it("extracts fenced code from example tags", () => {
    const examples = extract(`
/**
 * Creates a value.
 *
 * @example
 * \`\`\`typescript
 * const value = 1
 * \`\`\`
 */
const value = 1
`)

    assert.strictEqual(examples[0]?.source, "const value = 1")
  })
})
