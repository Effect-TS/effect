import { assert, describe, it } from "@effect/vitest"
import { analyze, type AnalyzeOptions } from "@effect/workspace"
import * as Effect from "effect/Effect"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const fixture = (name: string, nested = "") =>
  fileURLToPath(new URL(`./fixtures/workspace/${name}/${nested}`, import.meta.url)).replace(/\/$/, "")

const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

const legacyPackageJsonExports = (name: string, packagePath: string) => [{
  specifier: `${name}/package`,
  subpath: "./package",
  rule: "legacy",
  variants: [{
    distributionPath: `${packagePath}/package.json`,
    kind: "Resource",
    resolutionMode: "Require",
    format: "Json",
    conditionPath: [],
    fallbackPositions: [],
    provenance: { _tag: "Resolved", sourcePath: `${packagePath}/package.json` }
  }]
}, {
  specifier: `${name}/package.json`,
  subpath: "./package.json",
  rule: "legacy",
  variants: [{
    distributionPath: `${packagePath}/package.json`,
    kind: "Resource",
    resolutionMode: "Any",
    format: "Json",
    conditionPath: [],
    fallbackPositions: [],
    provenance: { _tag: "Resolved", sourcePath: `${packagePath}/package.json` }
  }]
}]

const failure = (name: string, options?: Parameters<typeof analyze>[0]) =>
  analyze({ cwd: fixture(name), ...options }).pipe(Effect.flip)

type Assert<T extends true> = T
export type _AnalyzeOptionsExcludeIncludePrivate = Assert<"includePrivate" extends keyof AnalyzeOptions ? false : true>

describe("Workspace analysis", () => {
  it.effect("uses authoritative nested and negated patterns without implicit or nested manifests", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({ cwd: fixture("membership") })

      assert.strictEqual(analysis.root, fixture("membership"))
      assert.deepStrictEqual(analysis.workspace.packages.map((pkg) => pkg.path), [
        "packages/nested/child",
        "packages/public"
      ])
      assert.deepStrictEqual(analysis.workspace.packages.map((pkg) => pkg.name), [
        "nested-child",
        "public-package"
      ])
      assert.ok(!analysis.workspace.packages.some((pkg) => pkg.name === "fixture-root"))
      assert.ok(!analysis.workspace.packages.some((pkg) => pkg.name === "excluded-package"))
      assert.ok(!analysis.workspace.packages.some((pkg) => pkg.name === "unselected-package"))
    }))

  it.effect("discovers the Workspace Root from a nested cwd", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({ cwd: fixture("membership", "packages/nested/child") })
      assert.strictEqual(analysis.root, fixture("membership"))
    }))

  it.effect("returns only Publishable Packages", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({ cwd: fixture("membership") })
      assert.ok(!analysis.workspace.packages.some((pkg) => pkg.name === "private-package"))
      assert.deepStrictEqual(analysis.workspace.packages.map((pkg) => pkg.version), ["1.0.0", "1.0.0"])
    }))

  it.effect("ignores private duplicate names, malformed exports, missing versions, and source trees", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({ cwd: fixture("private-scope") })
      assert.deepStrictEqual(analysis.workspace.packages.map((pkg) => pkg.name), ["public-package"])

      const duplicate = yield* analyze({ cwd: fixture("duplicate-private") })
      assert.deepStrictEqual(duplicate.workspace.packages.map((pkg) => pkg.name), ["duplicate-package"])
    }))

  it.effect("requires versions only for Publishable Packages and accumulates structural diagnostics", () =>
    Effect.gen(function*() {
      const error = yield* failure("structural-errors")
      assert.deepStrictEqual(error.diagnostics.map((diagnostic) => diagnostic._tag), [
        "InvalidPackageVersion",
        "MalformedExports"
      ])
    }))

  it.effect("maps invalid member identities to atomic analysis failure", () =>
    Effect.gen(function*() {
      const error = yield* failure("invalid-name")
      assert.deepStrictEqual(error.diagnostics.map((diagnostic) => diagnostic._tag), [
        "InvalidPackageName",
        "InvalidPackageVersion",
        "MalformedExports"
      ])
      assert.deepStrictEqual(plain(error.diagnostics[0]), {
        _tag: "InvalidPackageName",
        packagePath: "packages/unnamed"
      })
    }))

  it.effect("rejects source and distribution roots that escape a Workspace Package", () =>
    Effect.gen(function*() {
      const sourceError = yield* failure("membership", { sourceDirectory: "../shared" })
      const distributionError = yield* failure("membership", { distributionDirectory: "/dist" })
      assert.deepStrictEqual(plain(sourceError.diagnostics), [{
        _tag: "InvalidWorkspaceDirectory",
        option: "sourceDirectory",
        value: "../shared"
      }])
      assert.deepStrictEqual(plain(distributionError.diagnostics), [{
        _tag: "InvalidWorkspaceDirectory",
        option: "distributionDirectory",
        value: "/dist"
      }])
    }))

  it.effect("accumulates malformed manifests with diagnostics from readable selected packages", () =>
    Effect.gen(function*() {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "effect-workspace-"))
      fs.mkdirSync(path.join(root, "packages/bad"), { recursive: true })
      fs.mkdirSync(path.join(root, "packages/publishable"), { recursive: true })
      fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "fixture-root" }))
      fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n")
      fs.writeFileSync(path.join(root, "packages/bad/package.json"), "{ invalid")
      fs.writeFileSync(path.join(root, "packages/publishable/package.json"), JSON.stringify({ name: "publishable" }))

      const error = yield* analyze({ cwd: root }).pipe(
        Effect.flip,
        Effect.ensuring(Effect.sync(() => fs.rmSync(root, { force: true, recursive: true })))
      )
      assert.deepStrictEqual(error.diagnostics.map((diagnostic) => diagnostic._tag), [
        "PackageManifestUnavailable",
        "InvalidPackageVersion"
      ])
      assert.deepStrictEqual(
        error.diagnostics.map((diagnostic) => "packagePath" in diagnostic ? diagnostic.packagePath : undefined),
        [
          "packages/bad",
          "packages/publishable"
        ]
      )
    }))

  it.effect("expands packages without exports through legacy resolution", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({ cwd: fixture("membership") })
      const pkg = analysis.workspace.packages.find((pkg) => pkg.name === "nested-child")
      assert.deepStrictEqual(plain(pkg?.distribution), {
        packageType: "Unspecified",
        exportsMode: "Legacy",
        rules: [],
        exports: [
          {
            specifier: "nested-child/package",
            subpath: "./package",
            rule: "legacy",
            variants: [{
              distributionPath: "packages/nested/child/package.json",
              kind: "Resource",
              resolutionMode: "Require",
              format: "Json",
              conditionPath: [],
              fallbackPositions: [],
              provenance: { _tag: "Resolved", sourcePath: "packages/nested/child/package.json" }
            }]
          },
          {
            specifier: "nested-child/package.json",
            subpath: "./package.json",
            rule: "legacy",
            variants: [{
              distributionPath: "packages/nested/child/package.json",
              kind: "Resource",
              resolutionMode: "Any",
              format: "Json",
              conditionPath: [],
              fallbackPositions: [],
              provenance: { _tag: "Resolved", sourcePath: "packages/nested/child/package.json" }
            }]
          }
        ]
      })
    }))

  it.effect("replaces exports with publishConfig.exports instead of merging", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({
        cwd: fixture("membership"),
        sourceDirectory: "source",
        distributionDirectory: "dist"
      })
      const pkg = analysis.workspace.packages.find((pkg) => pkg.name === "public-package")
      assert.deepStrictEqual(pkg?.distribution.rules.map((rule) => rule.subpath), ["./published"])
      assert.deepStrictEqual(pkg?.distribution.exports.map((entry) => entry.specifier), ["public-package/published"])
      assert.strictEqual(pkg?.distribution.exports[0]?.variants[0]?.provenance._tag, "Missing")
      assert.ok(!("sourceDirectory" in analysis.workspace))
      assert.ok(!("distributionDirectory" in analysis.workspace))
    }))

  it.effect("constructs the Distribution Manifest with pnpm publishConfig replacement semantics", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({ cwd: fixture("../distribution-manifest") })
      const distributions = Object.fromEntries(
        analysis.workspace.packages.map((pkg) => [pkg.name, plain(pkg.distribution)])
      ) as Record<string, any>

      assert.deepStrictEqual(distributions["top-level"], {
        packageType: "Module",
        main: "./dist/index.js",
        exportsMode: "Exports",
        rules: [],
        exports: []
      })
      assert.deepStrictEqual(distributions["publish-replacement"], {
        packageType: "CommonJS",
        main: "./dist/published.cjs",
        exportsMode: "Exports",
        rules: [{
          _tag: "ExactExportRule",
          subpath: "./published",
          target: { _tag: "Target", value: "./dist/published.cjs" }
        }],
        exports: [{
          specifier: "publish-replacement",
          subpath: ".",
          rule: ".",
          variants: [],
          declarations: [{
            distributionPath: "packages/publish-replacement/dist/published.d.cts",
            conditionPath: ["types"],
            fallbackPositions: []
          }]
        }, {
          specifier: "publish-replacement/published",
          subpath: "./published",
          rule: "./published",
          declarations: [{
            distributionPath: "packages/publish-replacement/dist/published.d.cts",
            conditionPath: [],
            fallbackPositions: []
          }],
          variants: [{
            distributionPath: "packages/publish-replacement/dist/published.cjs",
            kind: "JavaScript",
            resolutionMode: "Any",
            format: "CommonJS",
            conditionPath: [],
            fallbackPositions: [],
            provenance: { _tag: "Missing", modulePath: "published" }
          }]
        }]
      })
      assert.deepStrictEqual(distributions["publish-null"], {
        packageType: "Unspecified",
        exportsMode: "Legacy",
        rules: [],
        exports: legacyPackageJsonExports("publish-null", "packages/publish-null")
      })
      assert.deepStrictEqual(distributions["top-level-fallback"], {
        packageType: "CommonJS",
        main: "./dist/index.cjs",
        exportsMode: "Legacy",
        rules: [],
        exports: legacyPackageJsonExports("top-level-fallback", "packages/top-level-fallback")
      })
      assert.deepStrictEqual(distributions["invalid-node-fields"], {
        packageType: "Unspecified",
        exportsMode: "Legacy",
        rules: [],
        exports: legacyPackageJsonExports("invalid-node-fields", "packages/invalid-node-fields")
      })
    }))
})
