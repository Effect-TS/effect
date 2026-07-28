import * as DocgenWorkspace from "@effect/docgen/Workspace"
import { assert, describe, it } from "@effect/vitest"
import {
  Ambiguous,
  Distribution,
  JavaScriptExportVariant,
  Missing,
  PackageExport,
  PublishablePackage,
  Resolved,
  Workspace
} from "@effect/workspace/Model"
import { analyze as analyzeWorkspace } from "@effect/workspace/Workspace"
import * as Effect from "effect/Effect"
import { fileURLToPath } from "node:url"

const variant = (provenance: Resolved | Missing | Ambiguous) =>
  new JavaScriptExportVariant({
    distributionPath: "packages/example/dist/index.js",
    kind: "JavaScript",
    resolutionMode: "Any",
    format: "Module",
    conditionPath: [],
    fallbackPositions: [],
    provenance
  })

const analysis = (exports: ReadonlyArray<PackageExport>) => ({
  root: "/repo",
  workspace: new Workspace({
    packages: [
      new PublishablePackage({
        name: "@effect/example",
        version: "1.0.0",
        path: "packages/example",
        distribution: new Distribution({
          packageType: "Module",
          exportsMode: "Exports",
          rules: [],
          exports
        })
      })
    ]
  })
})

const exported = (specifier: string, provenance: Resolved | Missing | Ambiguous) =>
  new PackageExport({
    specifier,
    subpath: specifier === "@effect/example" ? "." : "./index",
    rule: ".",
    variants: [variant(provenance)]
  })

describe("Workspace", () => {
  it.effect("selects sources from an analyzed package export surface", () =>
    Effect.gen(function*() {
      const workspace = yield* analyzeWorkspace({
        cwd: fileURLToPath(new URL("fixtures/workspace", import.meta.url))
      })
      const packages = yield* DocgenWorkspace.fromAnalysis(workspace)

      assert.strictEqual(packages.length, 2)
      const example = packages.find((pkg) => pkg.name === "@effect/example")!
      assert.strictEqual(example.files.length, 1)
      assert.deepStrictEqual(example.files[0].modulePath, ["src", "index.ts"])
      assert.deepStrictEqual(example.files[0].specifiers, ["@effect/example", "@effect/example/index"])
      assert.strictEqual(example.files[0].packageName, "@effect/example")
    }))

  it.effect("deduplicates public specifiers backed by the same source", () =>
    Effect.gen(function*() {
      const packages = yield* DocgenWorkspace.fromAnalysis(analysis([
        exported("@effect/example", new Resolved({ sourcePath: "packages/example/src/index.ts" })),
        exported("@effect/example/index", new Resolved({ sourcePath: "packages/example/src/index.ts" }))
      ]))

      assert.strictEqual(packages.length, 1)
      assert.strictEqual(packages[0].files.length, 1)
      assert.deepStrictEqual(packages[0].files[0].modulePath, ["src", "index.ts"])
      assert.deepStrictEqual(packages[0].files[0].specifiers, ["@effect/example", "@effect/example/index"])
    }))

  it.effect("filters package slugs and workspace-relative paths case-insensitively", () =>
    Effect.gen(function*() {
      const workspace = yield* analyzeWorkspace({
        cwd: fileURLToPath(new URL("fixtures/workspace", import.meta.url))
      })
      const packages = yield* DocgenWorkspace.fromAnalysis(workspace)
      const selected = yield* DocgenWorkspace.select(packages, {
        packages: ["SECOND"],
        paths: ["SRC/INDEX.TS"]
      })

      assert.deepStrictEqual(selected.map((pkg) => pkg.name), ["@effect/second"])
      assert.deepStrictEqual(selected[0].files.map((file) => file.sourcePath), ["packages/second/src/index.ts"])
    }))

  it.effect("scopes unfiltered package-local invocations and preserves explicit filters", () =>
    Effect.gen(function*() {
      const workspace = yield* analyzeWorkspace({
        cwd: fileURLToPath(new URL("fixtures/workspace", import.meta.url))
      })
      const packageCwd = fileURLToPath(new URL("fixtures/workspace/packages/example", import.meta.url))

      assert.deepStrictEqual(DocgenWorkspace.scopeToCwd(workspace, packageCwd, {}), {
        paths: ["packages/example/"]
      })
      assert.deepStrictEqual(DocgenWorkspace.scopeToCwd(workspace, packageCwd, { packages: ["second"] }), {
        packages: ["second"]
      })
      assert.deepStrictEqual(DocgenWorkspace.scopeToCwd(workspace, workspace.root, {}), {})
    }))

  it.effect("fails when filters select no sources", () =>
    Effect.gen(function*() {
      const packages = yield* DocgenWorkspace.fromAnalysis(analysis([
        exported("@effect/example", new Resolved({ sourcePath: "packages/example/src/index.ts" }))
      ]))
      const error = yield* Effect.flip(DocgenWorkspace.select(packages, { paths: ["missing"] }))

      assert.strictEqual(error.message, "No documentation sources matched the supplied filters")
    }))

  it.effect("reports missing and ambiguous source provenance", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(DocgenWorkspace.fromAnalysis(analysis([
        exported("@effect/example", new Missing({ modulePath: "index" })),
        exported(
          "@effect/example/index",
          new Ambiguous({
            modulePath: "index",
            candidates: ["packages/example/src/index.ts", "packages/example/src/index.tsx"]
          })
        )
      ])))

      assert.match(error.message, /has no source provenance for 'index'/)
      assert.match(error.message, /has ambiguous source provenance for 'index'/)
      assert.match(error.message, /src\/index\.tsx/)
    }))
})
