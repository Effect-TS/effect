import { assert, describe, it } from "@effect/vitest"
import {
  Ambiguous,
  analyze,
  ConditionsTarget,
  Distribution,
  ExactExportRule,
  FallbackTarget,
  JavaScriptExportVariant,
  Missing,
  NullTarget,
  PackageExport,
  PatternExportRule,
  PublishablePackage,
  Resolved,
  Target,
  validate,
  Workspace,
  type WorkspaceAnalysis
} from "@effect/workspace"
import * as Effect from "effect/Effect"
import { fileURLToPath } from "node:url"

const packagePath = "packages/pkg"
const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

const analysis = (
  rules: ReadonlyArray<ExactExportRule | PatternExportRule>,
  exports: ReadonlyArray<PackageExport>,
  options?: { readonly exportsMode?: "Exports" | "Legacy"; readonly main?: string }
): WorkspaceAnalysis => ({
  root: "/workspace",
  workspace: new Workspace({
    packages: [
      new PublishablePackage({
        name: "pkg",
        version: "1.0.0",
        path: packagePath,
        distribution: new Distribution({
          packageType: "Unspecified",
          main: options?.main,
          exportsMode: options?.exportsMode ?? "Exports",
          rules,
          exports
        })
      })
    ]
  })
})

const javascript = (
  distributionPath: string,
  provenance: Missing | Ambiguous | Resolved,
  conditionPath: ReadonlyArray<string> = [],
  fallbackPositions: ReadonlyArray<number> = []
) =>
  new JavaScriptExportVariant({
    distributionPath,
    kind: "JavaScript",
    resolutionMode: conditionPath.includes("import") ? "Import" : conditionPath.includes("require") ? "Require" : "Any",
    format: "Unknown",
    conditionPath,
    fallbackPositions,
    provenance
  })

const concrete = (
  subpath: string,
  variants: ReadonlyArray<JavaScriptExportVariant>,
  rule: string = subpath
) =>
  new PackageExport({
    specifier: subpath === "." ? "pkg" : `pkg${subpath.slice(1)}`,
    subpath,
    rule,
    variants
  })

const codes = (value: WorkspaceAnalysis) => validate(value).map((issue) => issue.code)

describe("Distribution Validation", () => {
  it("reports stale positive patterns, including targets without a star", () => {
    const value = analysis([
      new PatternExportRule({ subpath: "./empty/*", target: new Target({ value: "./dist/*.js" }) }),
      new PatternExportRule({ subpath: "./fixed/*", target: new Target({ value: "./dist/fixed.js" }) })
    ], [])

    assert.deepStrictEqual(codes(value), ["stale-pattern-rule", "stale-pattern-rule"])
  })

  it("keeps a broad pattern stale when an exact rule owns its apparent materialization", () => {
    const value = analysis([
      new PatternExportRule({ subpath: "./feature/*", target: new Target({ value: "./dist/*.js" }) }),
      new ExactExportRule({ subpath: "./feature/a", target: new Target({ value: "./dist/a.js" }) })
    ], [
      concrete("./feature/a", [javascript(`${packagePath}/dist/a.js`, new Missing({ modulePath: "a" }))])
    ])

    assert.deepStrictEqual(codes(value), [
      "stale-pattern-rule",
      "exact-javascript-target-missing-source"
    ])
  })

  it("keeps a broad pattern stale when a more-specific pattern owns its apparent materialization", () => {
    const value = analysis([
      new PatternExportRule({ subpath: "./feature/*", target: new Target({ value: "./dist/*.js" }) }),
      new PatternExportRule({
        subpath: "./feature/special/*",
        target: new Target({ value: "./dist/special/*.js" })
      })
    ], [
      concrete("./feature/special/a", [
        javascript(`${packagePath}/dist/special/a.js`, new Resolved({ sourcePath: `${packagePath}/src/a.ts` }))
      ], "./feature/special/*")
    ])

    assert.deepStrictEqual(codes(value), ["stale-pattern-rule"])
  })

  it("reports exact JavaScript Missing provenance without a duplicate concrete issue", () => {
    const value = analysis(
      [new ExactExportRule({ subpath: "./missing", target: new Target({ value: "./dist/missing.js" }) })],
      [concrete("./missing", [javascript(`${packagePath}/dist/missing.js`, new Missing({ modulePath: "missing" }))])]
    )

    assert.deepStrictEqual(codes(value), ["exact-javascript-target-missing-source"])
  })

  it("reports exact JavaScript Ambiguous provenance without a duplicate concrete issue", () => {
    const candidates = [`${packagePath}/src/index.ts`, `${packagePath}/src/index.tsx`]
    const value = analysis(
      [new ExactExportRule({ subpath: ".", target: new Target({ value: "./dist/index.js" }) })],
      [concrete(".", [javascript(`${packagePath}/dist/index.js`, new Ambiguous({ modulePath: "index", candidates }))])]
    )

    assert.deepStrictEqual(codes(value), ["exact-javascript-target-ambiguous-source"])
  })

  it("reports concrete pattern JavaScript Missing provenance", () => {
    const value = analysis(
      [new PatternExportRule({ subpath: "./*", target: new Target({ value: "./dist/*.js" }) })],
      [concrete(
        "./missing",
        [javascript(`${packagePath}/dist/missing.js`, new Missing({ modulePath: "missing" }))],
        "./*"
      )]
    )

    assert.deepStrictEqual(codes(value), ["javascript-export-missing-source"])
  })

  it("reports concrete pattern JavaScript Ambiguous provenance", () => {
    const candidates = [`${packagePath}/src/item.ts`, `${packagePath}/src/item.tsx`]
    const value = analysis(
      [new PatternExportRule({ subpath: "./*", target: new Target({ value: "./dist/*.js" }) })],
      [concrete("./item", [
        javascript(`${packagePath}/dist/item.js`, new Ambiguous({ modulePath: "item", candidates }))
      ], "./*")]
    )

    assert.deepStrictEqual(codes(value), ["javascript-export-ambiguous-source"])
  })

  it("reports structurally incompatible materializations but permits condition variants", () => {
    const rule = new ExactExportRule({
      subpath: ".",
      target: new ConditionsTarget({
        entries: [
          { condition: "import", target: new Target({ value: "./dist/import.js" }) },
          { condition: "require", target: new Target({ value: "./dist/require.js" }) }
        ]
      })
    })
    const provenance = new Resolved({ sourcePath: `${packagePath}/src/index.ts` })
    const value = analysis([rule], [
      concrete(".", [
        javascript(`${packagePath}/dist/import.js`, provenance, ["import"]),
        javascript(`${packagePath}/dist/conflict.js`, provenance, ["import"]),
        javascript(`${packagePath}/dist/require.js`, provenance, ["require"])
      ])
    ])

    assert.deepStrictEqual(codes(value), ["incompatible-package-export"])
  })

  it("reports distinct specifiers sharing a target once, independent of mode and conditions", () => {
    const target = `${packagePath}/dist/index.js`
    const provenance = new Resolved({ sourcePath: `${packagePath}/src/index.ts` })
    const value = analysis([], [
      concrete("./index", [
        javascript(target, provenance, ["require"]),
        javascript(target, provenance, ["import"])
      ], "legacy"),
      concrete(".", [javascript(target, provenance)], "main"),
      concrete("./index", [javascript(target, provenance)], "legacy")
    ], { exportsMode: "Legacy" })

    assert.deepStrictEqual(validate(value).map((issue) => plain(issue)), [{
      _tag: "DuplicatePackageTarget",
      code: "duplicate-package-target",
      packageName: "pkg",
      packagePath,
      distributionPath: target,
      specifiers: ["pkg", "pkg/index"]
    }])
  })

  it("does not treat multiple variants of one specifier as a duplicate target", () => {
    const target = `${packagePath}/dist/index.js`
    const provenance = new Resolved({ sourcePath: `${packagePath}/src/index.ts` })
    const value = analysis([], [
      concrete(".", [
        javascript(target, provenance, ["import"]),
        javascript(target, provenance, ["require"])
      ], "main")
    ], { exportsMode: "Legacy" })

    assert.deepStrictEqual(codes(value), [])
  })

  it("reports every invalid package-target leaf and deduplicates repeated defects", () => {
    const invalid = new Target({ value: "dependency/index.js" })
    const value = analysis([
      new ExactExportRule({
        subpath: ".",
        target: new FallbackTarget({ targets: [invalid, invalid] })
      })
    ], [])

    assert.deepStrictEqual(codes(value), ["invalid-package-target"])
  })

  it("reports target leaves that escape the Workspace Package", () => {
    const value = analysis([
      new ExactExportRule({ subpath: ".", target: new Target({ value: "./dist/../../outside.js" }) })
    ], [])

    assert.deepStrictEqual(codes(value), ["target-escapes-package"])
  })

  it("reports invalid concrete wildcard substitutions", () => {
    const value = analysis(
      [new PatternExportRule({ subpath: "./*", target: new Target({ value: "./dist/*.js" }) })],
      [concrete("./node_modules/item", [
        javascript(`${packagePath}/dist/node_modules/item.js`, new Missing({ modulePath: "node_modules/item" }))
      ], "./*")]
    )

    assert.ok(codes(value).includes("invalid-wildcard-substitution"))
  })

  it("reports an invalid wildcard form independently", () => {
    const value = analysis([
      new PatternExportRule({ subpath: "./*/*", target: new NullTarget() })
    ], [])

    assert.deepStrictEqual(codes(value), ["invalid-wildcard-substitution"])
  })

  it("reports concrete Package Exports with no usable target variant", () => {
    const value = analysis(
      [new ExactExportRule({ subpath: "./broken", target: new Target({ value: "./dist/expected.js" }) })],
      [concrete("./broken", [
        javascript(
          `${packagePath}/dist/other.js`,
          new Resolved({ sourcePath: `${packagePath}/src/other.ts` })
        )
      ])]
    )

    assert.deepStrictEqual(codes(value), ["package-export-no-usable-target"])
  })

  it("reports an effective main that produces no legacy root surface", () => {
    const value = analysis([], [], { exportsMode: "Legacy", main: "./dist/missing.js" })

    assert.deepStrictEqual(validate(value).map((issue) => plain(issue)), [{
      _tag: "EffectiveMainNoRootSurface",
      code: "effective-main-no-root-surface",
      packageName: "pkg",
      packagePath,
      main: "./dist/missing.js"
    }])
  })

  it("accepts ordered legacy import and require variants with different targets", () => {
    const provenance = new Resolved({ sourcePath: `${packagePath}/src/item.ts` })
    const entry = concrete("./item", [
      new JavaScriptExportVariant({
        distributionPath: `${packagePath}/dist/item.mjs`,
        kind: "JavaScript",
        resolutionMode: "Import",
        format: "Module",
        conditionPath: [],
        fallbackPositions: [],
        provenance
      }),
      new JavaScriptExportVariant({
        distributionPath: `${packagePath}/dist/item.js`,
        kind: "JavaScript",
        resolutionMode: "Require",
        format: "CommonJS",
        conditionPath: [],
        fallbackPositions: [],
        provenance
      })
    ], "legacy")

    assert.deepStrictEqual(codes(analysis([], [entry], { exportsMode: "Legacy" })), [])
  })

  it("orders packages and issue context deterministically", () => {
    const first = analysis([
      new ExactExportRule({ subpath: "./z", target: new Target({ value: "bad-z" }) }),
      new ExactExportRule({ subpath: "./a", target: new Target({ value: "bad-a" }) })
    ], [])
    const secondPackage = new PublishablePackage({
      name: "a",
      version: "1.0.0",
      path: "packages/a",
      distribution: new Distribution({
        packageType: "Unspecified",
        exportsMode: "Exports",
        rules: [new ExactExportRule({ subpath: ".", target: new Target({ value: "bad-root" }) })],
        exports: []
      })
    })
    const value: WorkspaceAnalysis = {
      ...first,
      workspace: new Workspace({ packages: [first.workspace.packages[0]!, secondPackage] })
    }

    assert.deepStrictEqual(
      validate(value).map((issue) => [issue.packagePath, "rule" in issue ? issue.rule : ""]),
      [["packages/a", "."], [packagePath, "./a"], [packagePath, "./z"]]
    )
  })

  it.effect("keeps analyzable distribution defects out of Workspace Analysis", () =>
    Effect.gen(function*() {
      const fixture = fileURLToPath(new URL("./fixtures/reverse-expansion", import.meta.url))
      const value = yield* analyze({ cwd: fixture, sourceDirectory: "code", distributionDirectory: "build" })
      const issues = validate(value)

      assert.ok(issues.some((issue) => issue.code === "exact-javascript-target-missing-source"))
      assert.ok(issues.some((issue) => issue.code === "exact-javascript-target-ambiguous-source"))
      assert.ok(issues.some((issue) => issue.code === "stale-pattern-rule"))
    }))

  it.effect("reports analyzed root and index specifiers that map to the same target", () =>
    Effect.gen(function*() {
      const fixture = fileURLToPath(new URL("./fixtures/legacy-expansion", import.meta.url))
      const value = yield* analyze({ cwd: fixture, distributionDirectory: "" })
      const pkg = value.workspace.packages.find((pkg) => pkg.name === "fallback-package")!
      const entries = pkg.distribution.exports.filter((entry) => entry.subpath === "." || entry.subpath === "./index")

      assert.deepStrictEqual(entries.map((entry) => [entry.subpath, entry.variants[0]?.distributionPath]), [
        [".", "packages/fallback/index.js"],
        ["./index", "packages/fallback/index.js"]
      ])
      assert.deepStrictEqual(
        validate(value).filter((issue) =>
          issue.code === "duplicate-package-target" &&
          issue.packageName === "fallback-package" &&
          issue.distributionPath === "packages/fallback/index.js"
        ).map((issue) => plain(issue)),
        [{
          _tag: "DuplicatePackageTarget",
          code: "duplicate-package-target",
          packageName: "fallback-package",
          packagePath: "packages/fallback",
          distributionPath: "packages/fallback/index.js",
          specifiers: ["fallback-package", "fallback-package/index", "fallback-package/index.js"]
        }]
      )
    }))
})
