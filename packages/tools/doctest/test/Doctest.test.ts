import * as Doctest from "@effect/doctest/Plugin"
import * as Source from "@effect/doctest/Source"
import { assert, describe, it } from "@effect/vitest"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const collectorId = (file: string, version: string): string => {
  const parameters = new URLSearchParams({ file, version })
  return `virtual:effect-doctest/collector?${parameters}`
}

const extract = (source: string) => Source.extract(source)

describe("Doctest", () => {
  it("extracts marked examples from JSDoc comments", () => {
    const examples = extract(`
/**
 * Internal helper.
 *
 * **Example** (Using the helper)
 *
 * \`\`\`ts import.meta.vitest name="uses helper"
 * const value = helper()
 * \`\`\`
 *
 * @internal
 */
const helper = () => 1
`)

    assert.strictEqual(examples.length, 1)
    assert.strictEqual(examples[0]?.name, "uses helper")
    assert.strictEqual(examples[0]?.line, 7)
    assert.strictEqual(examples[0]?.source, "const value = helper()")
  })

  it("extracts examples in source order", () => {
    const examples = extract(`
const let_ = () => []

export {
  /**
   * **Example** (Using let)
   *
   * \`\`\`ts import.meta.vitest
   * const result = 1
   * \`\`\`
   */
  let_ as let
}

class Service {
  /**
   * **Example** (Calling a method)
   *
   * \`\`\`ts import.meta.vitest
   * const result = Service.make()
   * \`\`\`
   */
  static make() {}
}
`)

    assert.deepStrictEqual(examples.map((example) => example.name), [undefined, undefined])
    assert.deepStrictEqual(examples.map((example) => example.source), [
      "const result = 1",
      "const result = Service.make()"
    ])
  })

  it("records the opening line for each fence", () => {
    const examples = extract(`
/**
 * \`\`\`ts import.meta.vitest
 * const first = 1
 * \`\`\`
 */
interface Module {}

/**
 * \`\`\`ts import.meta.vitest
 * const second = 2
 * \`\`\`
 */
namespace Module {}
`)

    assert.deepStrictEqual(examples.map((example) => example.line), [3, 10])
  })

  it("ignores unmarked examples", () => {
    const examples = extract(`
/**
 * **Example** (Documentation only)
 *
 * \`\`\`ts
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
 * \`\`\`typescript import.meta.vitest
 * const value = 1
 * \`\`\`
 */
const value = 1
`)

    assert.strictEqual(examples[0]?.source, "const value = 1")
  })

  it("extracts marked Markdown fences", () => {
    const examples = Source.extract(
      `
# Example

\`\`\`ts
const ignored = true
\`\`\`

\`\`\`ts import.meta.vitest
import { value } from "./value.ts"
export const result = await Promise.resolve(value)
\`\`\`
`,
      "markdown"
    )

    assert.strictEqual(examples.length, 1)
    assert.isUndefined(examples[0]?.name)
    assert.strictEqual(examples[0]?.line, 8)
    assert.match(examples[0]?.source ?? "", /import \{ value \}/)
  })

  it("reloads invalidated virtual example modules", () => {
    const root = mkdtempSync(join(tmpdir(), "effect-doctest-plugin-"))
    const file = join(root, "src", "watch.ts")
    const source = (version: number) => `
/**
 * \`\`\`ts import.meta.vitest
 * export const version = ${version}
 * \`\`\`
 */
const watch = true
`
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, source(1))
    const plugin = Doctest.plugin()
    const resolveId = plugin.resolveId
    const load = plugin.load
    const watchChange = plugin.watchChange
    if (
      typeof resolveId !== "function" || typeof load !== "function" || typeof watchChange !== "function"
    ) {
      return assert.fail("expected function plugin hooks")
    }
    const context = { addWatchFile() {} } as never
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
                assert.match(refreshed, /test\("line 3"/)
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
