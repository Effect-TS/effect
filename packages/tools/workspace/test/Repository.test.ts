import { assert, describe, it } from "@effect/vitest"
import { analyze } from "@effect/workspace"
import * as Effect from "effect/Effect"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const cwd = fileURLToPath(new URL("../", import.meta.url)).replace(/\/$/, "")
const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

describe("Repository smoke", () => {
  it.effect("analyzes the actual repository with stable portable results", () =>
    Effect.gen(function*() {
      const first = yield* analyze({ cwd })
      const second = yield* analyze({ cwd })

      assert.deepStrictEqual(plain(first.workspace), plain(second.workspace))

      const effect = first.workspace.packages.find((pkg) => pkg.name === "effect")
      assert.strictEqual(effect?.version, "4.0.0-beta.101")

      const jsdocs = first.workspace.packages.find((pkg) => pkg.name === "@effect/jsdocs")
      assert.strictEqual(jsdocs, undefined)

      const array = effect?.distribution.exports.find((entry) => entry.specifier === "effect/Array")
      assert.deepStrictEqual(plain(array), {
        specifier: "effect/Array",
        subpath: "./Array",
        rule: "./*",
        declarations: [{
          distributionPath: "packages/effect/dist/Array.d.ts",
          conditionPath: [],
          fallbackPositions: []
        }],
        variants: [{
          distributionPath: "packages/effect/dist/Array.js",
          kind: "JavaScript",
          resolutionMode: "Any",
          format: "Module",
          conditionPath: [],
          fallbackPositions: [],
          provenance: { _tag: "Resolved", sourcePath: "packages/effect/src/Array.ts" }
        }]
      })
      assert.ok(!effect?.distribution.exports.some((entry) => entry.specifier.startsWith("effect/internal/")))
      for (const pkg of first.workspace.packages) {
        assert.ok(!path.isAbsolute(pkg.path), pkg.path)
        for (const entry of pkg.distribution.exports) {
          for (const variant of entry.variants) {
            assert.ok(!path.isAbsolute(variant.distributionPath), variant.distributionPath)
            if (variant.provenance._tag === "Resolved") {
              assert.ok(!path.isAbsolute(variant.provenance.sourcePath), variant.provenance.sourcePath)
            } else if (variant.provenance._tag === "Missing" || variant.provenance._tag === "Ambiguous") {
              assert.ok(!path.isAbsolute(variant.provenance.modulePath), variant.provenance.modulePath)
              if (variant.provenance._tag === "Ambiguous") {
                for (const candidate of variant.provenance.candidates) {
                  assert.ok(!path.isAbsolute(candidate), candidate)
                }
              }
            }
          }
        }
      }
    }))
})
