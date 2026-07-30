import * as Examples from "@effect/doctest/Examples"
import * as SourceExamples from "@effect/doctest/SourceExamples"
import { assert, describe, it } from "@effect/vitest"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const collectorId = (file: string, version: string): string => {
  const parameters = new URLSearchParams({ file, version })
  return `virtual:effect-doctest/collector?${parameters}`
}

const extract = (source: string) =>
  SourceExamples.extract({
    file: "/workspace/packages/example/src/Module.ts",
    source,
    packageName: "@effect/example",
    packageRoot: "/workspace/packages/example",
    workspaceRoot: "/workspace"
  })

describe("Doctest", () => {
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

  it("assigns unique indices to merged declarations", () => {
    const examples = extract(`
/**
 * \`\`\`ts
 * const first = 1
 * \`\`\`
 */
interface Module {}

/**
 * \`\`\`ts
 * const second = 2
 * \`\`\`
 */
namespace Module {}
`)

    assert.deepStrictEqual(examples.map((example) => example.name), [
      "@effect/example/Module example 1",
      "@effect/example/Module example 2"
    ])
    assert.deepStrictEqual(examples.map((example) => example.index), [1, 2])
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

  it("reloads invalidated virtual example modules", () => {
    const root = mkdtempSync(join(tmpdir(), "effect-doctest-plugin-"))
    const file = join(root, "src", "watch.ts")
    const source = (version: number) => `
/**
 * \`\`\`ts
 * export const version = ${version}
 * \`\`\`
 */
const watch = true
`
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fixture" }))
    writeFileSync(file, source(1))
    const plugin = Examples.vitestPlugin()
    const configResolved = plugin.configResolved
    const resolveId = plugin.resolveId
    const load = plugin.load
    const watchChange = plugin.watchChange
    if (
      typeof configResolved !== "function" || typeof resolveId !== "function" || typeof load !== "function" ||
      typeof watchChange !== "function"
    ) {
      return assert.fail("expected function plugin hooks")
    }
    const context = { addWatchFile() {} } as never
    configResolved.call(context, { root } as never)
    return Promise.resolve(resolveId.call(context, collectorId(file, "first"), undefined, {} as never)).then(
      (collector) => {
        if (typeof collector !== "string") return assert.fail("expected resolved collector ID")
        return Promise.resolve(load.call(context, collector, {} as never)).then(() => {
          writeFileSync(file, source(2))
          watchChange.call(context, file, { event: "update" })
          return Promise.resolve(resolveId.call(context, collectorId(file, "second"), undefined, {} as never)).then(
            (refreshedId) => {
              if (typeof refreshedId !== "string") return assert.fail("expected refreshed collector ID")
              assert.notStrictEqual(refreshedId, collector)
              return Promise.resolve(load.call(context, refreshedId, {} as never)).then((refreshed) => {
                if (typeof refreshed !== "string") return assert.fail("expected refreshed collector module")
                assert.match(refreshed, /doctestExample/)
                assert.match(refreshed, /fixture\/watch example 1/)
                const encodedId = /import\((".*")\)/.exec(refreshed)?.[1]
                if (encodedId === undefined) return assert.fail("expected virtual example import")
                const id = JSON.parse(encodedId)
                return Promise.resolve(resolveId.call(context, id, undefined, {} as never)).then((resolved) => {
                  if (typeof resolved !== "string") return assert.fail("expected resolved example ID")
                  return Promise.resolve(load.call(context, resolved, {} as never)).then((source) => {
                    if (typeof source !== "string") return assert.fail("expected example module source")
                    assert.strictEqual(source, "export const version = 2")
                  })
                })
              })
            }
          )
        })
      }
    ).finally(() => rmSync(root, { recursive: true, force: true }))
  })
})
