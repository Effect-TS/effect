import { assert, describe, it } from "@effect/vitest"
import { analyze } from "@effect/workspace"
import * as Effect from "effect/Effect"
import { fileURLToPath } from "node:url"

const fixture = fileURLToPath(new URL("./fixtures/reverse-expansion", import.meta.url)).replace(/\/$/, "")
const plain = (value: unknown): any => JSON.parse(JSON.stringify(value))

const run = () => analyze({ cwd: fixture, sourceDirectory: "code", distributionDirectory: "build" })

describe("Reverse Package Module Expansion", () => {
  it.effect("expands publishConfig exports from configured source Module Paths", () =>
    Effect.gen(function*() {
      const analysis = yield* run()
      const pkg = analysis.workspace.packages.find((pkg) => pkg.name === "reverse-package")!

      assert.deepStrictEqual(pkg.distribution.exports.map((entry) => entry.specifier), [
        "reverse-package",
        "reverse-package/ambiguous",
        "reverse-package/copy/a/b",
        "reverse-package/custom",
        "reverse-package/different/nested/tool",
        "reverse-package/encoded",
        "reverse-package/exact",
        "reverse-package/extensions/cjs",
        "reverse-package/extensions/cts",
        "reverse-package/extensions/js",
        "reverse-package/extensions/jsx",
        "reverse-package/extensions/mjs",
        "reverse-package/extensions/mts",
        "reverse-package/extensions/ts",
        "reverse-package/extensions/tsx",
        "reverse-package/import-default",
        "reverse-package/missing",
        "reverse-package/mjs-exact",
        "reverse-package/nested/a/b",
        "reverse-package/node-before-import",
        "reverse-package/node-default",
        "reverse-package/outside-root",
        "reverse-package/package.json",
        "reverse-package/query",
        "reverse-package/query-pattern/item",
        "reverse-package/resource-resource",
        "reverse-package/typed",
        "reverse-package/typed/item",
        "reverse-package/variants/item"
      ])
      assert.ok(!pkg.distribution.exports.some((entry) => entry.specifier.includes("normal-only")))
      assert.ok(!pkg.distribution.exports.some((entry) => entry.specifier.includes("private")))
      assert.ok(!pkg.distribution.exports.some((entry) => entry.specifier.includes("special")))
      assert.ok(!pkg.distribution.exports.some((entry) => entry.specifier.includes("declaration")))
      assert.ok(!pkg.distribution.exports.some((entry) => entry.specifier.includes("no-star")))
      assert.ok(!pkg.distribution.exports.some((entry) => entry.specifier.includes("empty")))
      assert.deepStrictEqual(
        pkg.distribution.rules.filter((rule) => rule.subpath === "./no-star/*" || rule.subpath === "./empty/*")
          .map((rule) => rule.subpath),
        ["./empty/*", "./no-star/*"]
      )

      const bySpecifier = new Map(pkg.distribution.exports.map((entry) => [entry.specifier, plain(entry)]))
      assert.deepStrictEqual(bySpecifier.get("reverse-package/exact")?.variants[0], {
        distributionPath: "packages/z-reverse/build/exact.js",
        kind: "JavaScript",
        resolutionMode: "Any",
        format: "Module",
        conditionPath: [],
        fallbackPositions: [],
        provenance: { _tag: "Resolved", sourcePath: "packages/z-reverse/code/exact.ts" }
      })
      assert.strictEqual(bySpecifier.get("reverse-package/exact")?.rule, "./exact")
      assert.deepStrictEqual(bySpecifier.get("reverse-package/exact")?.declarations, [{
        distributionPath: "packages/z-reverse/build/exact.d.ts",
        conditionPath: [],
        fallbackPositions: []
      }])
      assert.deepStrictEqual(bySpecifier.get("reverse-package/typed")?.declarations, [{
        distributionPath: "packages/z-reverse/build/exact.d.ts",
        conditionPath: ["types"],
        fallbackPositions: []
      }])
      assert.deepStrictEqual(bySpecifier.get("reverse-package/typed/item")?.declarations, [{
        distributionPath: "packages/z-reverse/build/types/item.d.ts",
        conditionPath: ["types"],
        fallbackPositions: []
      }])
      assert.strictEqual(bySpecifier.get("reverse-package/nested/a/b")?.rule, "./nested/*")
      assert.deepStrictEqual(bySpecifier.get("reverse-package/encoded")?.variants[0], {
        distributionPath: "packages/z-reverse/build/encoded.js",
        kind: "JavaScript",
        resolutionMode: "Any",
        format: "Module",
        conditionPath: [],
        fallbackPositions: [],
        provenance: { _tag: "Resolved", sourcePath: "packages/z-reverse/code/encoded.ts" }
      })
      assert.strictEqual(
        bySpecifier.get("reverse-package/copy/a/b")?.variants[0].distributionPath,
        "packages/z-reverse/build/repeat/a/b/copy-a/b.js"
      )
      assert.deepStrictEqual(bySpecifier.get("reverse-package/missing")?.variants[0].provenance, {
        _tag: "Missing",
        modulePath: "missing"
      })
      assert.deepStrictEqual(bySpecifier.get("reverse-package/outside-root")?.variants[0].provenance, {
        _tag: "Missing",
        modulePath: "outside-root"
      })
      assert.deepStrictEqual(bySpecifier.get("reverse-package/query")?.variants[0], {
        distributionPath: "packages/z-reverse/build/query.js",
        kind: "JavaScript",
        resolutionMode: "Any",
        format: "Module",
        conditionPath: [],
        fallbackPositions: [],
        provenance: { _tag: "Resolved", sourcePath: "packages/z-reverse/code/query.ts" }
      })
      assert.deepStrictEqual(bySpecifier.get("reverse-package/query-pattern/item")?.variants[0], {
        distributionPath: "packages/z-reverse/build/query-pattern/item.js",
        kind: "JavaScript",
        resolutionMode: "Any",
        format: "Module",
        conditionPath: [],
        fallbackPositions: [],
        provenance: {
          _tag: "Resolved",
          sourcePath: "packages/z-reverse/code/query-pattern/item.ts"
        }
      })
      assert.deepStrictEqual(bySpecifier.get("reverse-package/ambiguous")?.variants[0].provenance, {
        _tag: "Ambiguous",
        modulePath: "ambiguous",
        candidates: [
          "packages/z-reverse/code/ambiguous.ts",
          "packages/z-reverse/code/ambiguous.tsx"
        ]
      })
      assert.deepStrictEqual(bySpecifier.get("reverse-package/package.json")?.variants[0].provenance, {
        _tag: "Resolved",
        sourcePath: "packages/z-reverse/package.json"
      })
      assert.deepStrictEqual(bySpecifier.get("reverse-package/resource-resource")?.variants[0], {
        distributionPath: "packages/z-reverse/build/assets/resource.css",
        kind: "Resource",
        resolutionMode: "Any",
        format: "Unknown",
        conditionPath: [],
        fallbackPositions: [],
        provenance: { _tag: "Resolved", sourcePath: "packages/z-reverse/code/assets/resource.css" }
      })
      assert.deepStrictEqual(bySpecifier.get("reverse-package")?.variants[0].provenance, { _tag: "NotRequired" })
    }))

  it.effect("groups condition variants in semantic order", () =>
    Effect.gen(function*() {
      const analysis = yield* run()
      const variants = analysis.workspace.packages
        .find((pkg) => pkg.name === "reverse-package")!
        .distribution.exports.find((entry) => entry.specifier === "reverse-package/variants/item")!.variants

      assert.deepStrictEqual(plain(variants), [
        {
          distributionPath: "packages/z-reverse/build/esm/item.mjs",
          kind: "JavaScript",
          resolutionMode: "Import",
          format: "Module",
          conditionPath: ["import"],
          fallbackPositions: [],
          provenance: { _tag: "Resolved", sourcePath: "packages/z-reverse/code/esm/item.ts" }
        },
        {
          distributionPath: "packages/z-reverse/build/cjs/item.js",
          kind: "JavaScript",
          resolutionMode: "Require",
          format: "Module",
          conditionPath: ["require"],
          fallbackPositions: [1],
          provenance: { _tag: "Resolved", sourcePath: "packages/z-reverse/code/cjs/item.cts" }
        }
      ])

      const exports = new Map(analysis.workspace.packages
        .find((pkg) => pkg.name === "reverse-package")!
        .distribution.exports.map((entry) => [entry.specifier, plain(entry)]))
      assert.deepStrictEqual(exports.get("reverse-package/mjs-exact")?.variants[0].provenance, {
        _tag: "Resolved",
        sourcePath: "packages/z-reverse/code/exact.ts"
      })
      assert.deepStrictEqual(
        exports.get("reverse-package/import-default")?.variants.map((variant: any) => variant.resolutionMode),
        ["Import", "Require"]
      )
      assert.deepStrictEqual(
        exports.get("reverse-package/node-default")?.variants.map((variant: any) => variant.resolutionMode),
        ["Any"]
      )
      assert.deepStrictEqual(
        exports.get("reverse-package/node-before-import")?.variants.map((variant: any) => variant.conditionPath),
        [["node"]]
      )
      assert.deepStrictEqual(
        exports.get("reverse-package/custom")?.variants.map((
          variant: any
        ) => [variant.conditionPath, variant.resolutionMode]),
        [[["custom"], "Any"], [["default"], "Any"]]
      )
    }))

  it.effect("returns scoped and unscoped full specifiers with deterministic portable paths", () =>
    Effect.gen(function*() {
      const first = yield* run()
      const second = yield* run()
      assert.deepStrictEqual(plain(first.workspace), plain(second.workspace))
      assert.deepStrictEqual(first.workspace.packages.map((pkg) => pkg.name), [
        "@scope/reverse",
        "dist-absent",
        "dist-present",
        "reverse-package"
      ])
      assert.deepStrictEqual(
        first.workspace.packages[0]!.distribution.exports.map((entry) => entry.specifier),
        ["@scope/reverse", "@scope/reverse/z"]
      )
      assert.ok(!JSON.stringify(first.workspace).includes(fixture))
      assert.ok(!("sourceDirectory" in first.workspace))
      assert.ok(!("distributionDirectory" in first.workspace))
    }))

  it.effect("is identical for equivalent packages with build output absent or present", () =>
    Effect.gen(function*() {
      const analysis = yield* run()
      const absent = plain(analysis.workspace.packages.find((pkg) => pkg.name === "dist-absent")!.distribution)
      const present = plain(analysis.workspace.packages.find((pkg) => pkg.name === "dist-present")!.distribution)
      assert.strictEqual(absent.exports.length, 2)
      assert.strictEqual(absent.exports[1].variants[0].provenance._tag, "Missing")
      const normalize = (value: any, packagePath: string) =>
        JSON.parse(
          JSON.stringify(value)
            .replaceAll(packagePath, "packages/dist")
            .replaceAll("dist-absent", "dist-package")
            .replaceAll("dist-present", "dist-package")
        )
      assert.deepStrictEqual(normalize(absent, "packages/dist-absent"), normalize(present, "packages/dist-present"))
    }))

  it.effect("normalizes equivalent configured root spellings", () =>
    Effect.gen(function*() {
      const normalized = yield* run()
      const equivalent = yield* analyze({
        cwd: fixture,
        sourceDirectory: "./code/",
        distributionDirectory: "./build/"
      })
      assert.deepStrictEqual(plain(equivalent.workspace), plain(normalized.workspace))
    }))

  it.effect("does not inventory distribution output when the source root is the package root", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({ cwd: fixture, sourceDirectory: "", distributionDirectory: "build" })
      const absent = plain(analysis.workspace.packages.find((pkg) => pkg.name === "dist-absent")!.distribution)
      const present = plain(analysis.workspace.packages.find((pkg) => pkg.name === "dist-present")!.distribution)
      const normalize = (value: any, packagePath: string) =>
        JSON.parse(
          JSON.stringify(value)
            .replaceAll(packagePath, "packages/dist")
            .replaceAll("dist-absent", "dist-package")
            .replaceAll("dist-present", "dist-package")
        )
      assert.deepStrictEqual(normalize(absent, "packages/dist-absent"), normalize(present, "packages/dist-present"))
    }))
})
