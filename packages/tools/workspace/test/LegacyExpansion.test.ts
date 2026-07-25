import { assert, describe, it } from "@effect/vitest"
import { analyze } from "@effect/workspace"
import * as Effect from "effect/Effect"
import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const fixture = fileURLToPath(new URL("./fixtures/legacy-expansion", import.meta.url))
const plain = (value: unknown): any => JSON.parse(JSON.stringify(value))

type OracleMode = "Import" | "Require"

const oracleMatrix: ReadonlyArray<{
  readonly specifier: string
  readonly mode: OracleMode
  readonly target: string
}> = [
  { specifier: "legacy-package", mode: "Import", target: "dist/main.js" },
  { specifier: "legacy-package", mode: "Require", target: "dist/main.js" },
  { specifier: "legacy-package/dist/addon", mode: "Require", target: "dist/addon.node" },
  { specifier: "legacy-package/dist/addon.node", mode: "Import", target: "dist/addon.node" },
  { specifier: "legacy-package/dist/addon.node", mode: "Require", target: "dist/addon.node" },
  { specifier: "legacy-package/dist/cjs.cjs", mode: "Import", target: "dist/cjs.cjs" },
  { specifier: "legacy-package/dist/cjs.cjs", mode: "Require", target: "dist/cjs.cjs" },
  { specifier: "legacy-package/dist/collision", mode: "Import", target: "dist/collision" },
  { specifier: "legacy-package/dist/collision", mode: "Require", target: "dist/collision" },
  { specifier: "legacy-package/dist/collision.js", mode: "Import", target: "dist/collision.js" },
  { specifier: "legacy-package/dist/collision.js", mode: "Require", target: "dist/collision.js" },
  { specifier: "legacy-package/dist/data", mode: "Require", target: "dist/data.json" },
  { specifier: "legacy-package/dist/data.json", mode: "Import", target: "dist/data.json" },
  { specifier: "legacy-package/dist/data.json", mode: "Require", target: "dist/data.json" },
  { specifier: "legacy-package/dist/directory", mode: "Require", target: "dist/directory/index.js" },
  { specifier: "legacy-package/dist/directory/index", mode: "Require", target: "dist/directory/index.js" },
  { specifier: "legacy-package/dist/directory/index.js", mode: "Import", target: "dist/directory/index.js" },
  { specifier: "legacy-package/dist/directory/index.js", mode: "Require", target: "dist/directory/index.js" },
  { specifier: "legacy-package/dist/exact.mjs", mode: "Import", target: "dist/exact.mjs" },
  { specifier: "legacy-package/dist/exact.mjs", mode: "Require", target: "dist/exact.mjs" },
  { specifier: "legacy-package/dist/main", mode: "Require", target: "dist/main.js" },
  { specifier: "legacy-package/dist/main.js", mode: "Import", target: "dist/main.js" },
  { specifier: "legacy-package/dist/main.js", mode: "Require", target: "dist/main.js" },
  { specifier: "legacy-package/dist/nested", mode: "Require", target: "dist/nested/entry.js" },
  { specifier: "legacy-package/dist/nested/entry", mode: "Require", target: "dist/nested/entry.js" },
  { specifier: "legacy-package/dist/nested/entry.js", mode: "Import", target: "dist/nested/entry.js" },
  { specifier: "legacy-package/dist/nested/entry.js", mode: "Require", target: "dist/nested/entry.js" },
  { specifier: "legacy-package/dist/nested/package", mode: "Require", target: "dist/nested/package.json" },
  { specifier: "legacy-package/dist/nested/package.json", mode: "Import", target: "dist/nested/package.json" },
  { specifier: "legacy-package/dist/nested/package.json", mode: "Require", target: "dist/nested/package.json" },
  { specifier: "legacy-package/dist/nested/plain", mode: "Import", target: "dist/nested/plain" },
  { specifier: "legacy-package/dist/nested/plain", mode: "Require", target: "dist/nested/plain" },
  { specifier: "legacy-package/dist/odd.js", mode: "Require", target: "dist/odd.js.js" },
  { specifier: "legacy-package/dist/odd.js.js", mode: "Import", target: "dist/odd.js.js" },
  { specifier: "legacy-package/dist/odd.js.js", mode: "Require", target: "dist/odd.js.js" },
  { specifier: "legacy-package/package", mode: "Require", target: "package.json" },
  { specifier: "legacy-package/package.json", mode: "Import", target: "package.json" },
  { specifier: "legacy-package/package.json", mode: "Require", target: "package.json" }
]

const sentinelFiles = [
  {
    target: "package.json",
    contents: JSON.stringify({ name: "legacy-package", type: "module", main: "./dist/main", sentinel: "package.json" })
  },
  { target: "dist/addon.node", contents: "" },
  { target: "dist/cjs.cjs", contents: `module.exports = "dist/cjs.cjs"\n` },
  { target: "dist/collision", contents: `export default "dist/collision"\n` },
  { target: "dist/collision.js", contents: `export default "dist/collision.js"\n` },
  { target: "dist/data.json", contents: JSON.stringify({ sentinel: "dist/data.json" }) },
  { target: "dist/directory/index.js", contents: `export default "dist/directory/index.js"\n` },
  { target: "dist/exact.mjs", contents: `export default "dist/exact.mjs"\n` },
  { target: "dist/main.js", contents: `export default "dist/main.js"\n` },
  {
    target: "dist/nested/package.json",
    contents: JSON.stringify({ main: "./entry", type: "commonjs", sentinel: "dist/nested/package.json" })
  },
  { target: "dist/nested/entry.js", contents: `module.exports = "dist/nested/entry.js"\n` },
  { target: "dist/nested/plain", contents: `module.exports = "dist/nested/plain"\n` },
  { target: "dist/odd.js.js", contents: `export default "dist/odd.js.js"\n` }
] as const

describe("Legacy Package Surface expansion", () => {
  it.effect("projects source files and inverts import and require resolution", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({ cwd: fixture })
      const repeated = yield* analyze({ cwd: fixture })
      assert.deepStrictEqual(plain(repeated.workspace), plain(analysis.workspace))
      const pkg = analysis.workspace.packages.find((pkg) => pkg.name === "legacy-package")!
      const exports = new Map(pkg.distribution.exports.map((entry) => [entry.specifier, plain(entry)]))

      assert.deepStrictEqual(exports.get("legacy-package"), {
        specifier: "legacy-package",
        subpath: ".",
        rule: "main",
        declarations: [{
          distributionPath: "packages/legacy/dist/main.d.ts",
          conditionPath: [],
          fallbackPositions: []
        }],
        variants: [{
          distributionPath: "packages/legacy/dist/main.js",
          kind: "JavaScript",
          resolutionMode: "Any",
          format: "Module",
          conditionPath: [],
          fallbackPositions: [],
          provenance: {
            _tag: "Ambiguous",
            modulePath: "main",
            candidates: [
              "packages/legacy/src/main.ts",
              "packages/legacy/src/main.tsx"
            ]
          }
        }]
      })
      assert.strictEqual(exports.get("legacy-package/dist/exact.mjs")?.variants[0].resolutionMode, "Any")
      assert.strictEqual(exports.get("legacy-package/dist/exact.mjs")?.variants[0].format, "Module")
      assert.ok(!exports.has("legacy-package/dist/exact"))
      assert.strictEqual(
        exports.get("legacy-package/dist/odd.js")?.variants[0].distributionPath,
        "packages/legacy/dist/odd.js.js"
      )
      assert.strictEqual(
        exports.get("legacy-package/dist/collision")?.variants[0].distributionPath,
        "packages/legacy/dist/collision"
      )
      assert.strictEqual(exports.get("legacy-package/dist/collision")?.variants[0].kind, "JavaScript")
      assert.strictEqual(exports.get("legacy-package/dist/collision")?.variants[0].format, "Module")
      assert.strictEqual(
        exports.get("legacy-package/dist/directory")?.variants[0].distributionPath,
        "packages/legacy/dist/directory/index.js"
      )
      assert.strictEqual(exports.get("legacy-package/dist/directory")?.variants[0].resolutionMode, "Require")
      assert.strictEqual(
        exports.get("legacy-package/dist/nested")?.variants[0].distributionPath,
        "packages/legacy/dist/nested/entry.js"
      )
      assert.strictEqual(exports.get("legacy-package/dist/nested")?.variants[0].format, "CommonJS")
      assert.deepStrictEqual(
        plain(exports.get("legacy-package/dist/nested/plain")?.variants[0]),
        {
          distributionPath: "packages/legacy/dist/nested/plain",
          kind: "JavaScript",
          resolutionMode: "Any",
          format: "CommonJS",
          conditionPath: [],
          fallbackPositions: [],
          provenance: {
            _tag: "Resolved",
            sourcePath: "packages/legacy/src/nested/plain"
          }
        }
      )
      assert.strictEqual(exports.get("legacy-package/dist/data.json")?.variants[0].format, "Json")
      assert.strictEqual(exports.get("legacy-package/dist/addon.node")?.variants[0].format, "Native")
      assert.ok(!exports.has("legacy-package/dist/directory/"))
      assert.ok(!exports.has("legacy-package/dist/decoy.js"))
    }))

  it.effect("encapsulates exports and applies effective publishConfig main and type", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({ cwd: fixture })
      const encapsulated = analysis.workspace.packages.find((pkg) => pkg.name === "encapsulated-package")!
      assert.deepStrictEqual(encapsulated.distribution.exports.map((entry) => entry.specifier), [
        "encapsulated-package"
      ])
      assert.strictEqual(encapsulated.distribution.exports[0]?.rule, ".")
      assert.deepStrictEqual(encapsulated.distribution.exports[0]?.variants.map((variant) => variant.resolutionMode), [
        "Import",
        "Require"
      ])

      const override = analysis.workspace.packages.find((pkg) => pkg.name === "override-package")!
      assert.strictEqual(override.distribution.main, "./dist/published.js")
      assert.strictEqual(override.distribution.exports[0]?.rule, "main")
      assert.strictEqual(override.distribution.exports[0]?.variants[0]?.format, "CommonJS")

      const exactMain = analysis.workspace.packages.find((pkg) => pkg.name === "exact-main-package")!
      assert.strictEqual(
        exactMain.distribution.exports[0]?.variants[0]?.distributionPath,
        "packages/exact-main/dist/entry"
      )
      assert.strictEqual(exactMain.distribution.exports[0]?.variants[0]?.kind, "JavaScript")
      assert.strictEqual(exactMain.distribution.exports[0]?.variants[0]?.format, "Unknown")
      const mjs = analysis.workspace.packages.find((pkg) => pkg.name === "main-mjs-package")!
      assert.strictEqual(mjs.distribution.exports[0]?.variants[0]?.format, "Module")
      const mainDirectory = analysis.workspace.packages.find((pkg) => pkg.name === "main-directory-package")!
      assert.strictEqual(
        mainDirectory.distribution.exports[0]?.variants[0]?.distributionPath,
        "packages/main-directory/dist/directory/index.js"
      )

      const scoped = analysis.workspace.packages.find((pkg) => pkg.name === "@scope/legacy")!
      assert.strictEqual(scoped.distribution.exports[0]?.specifier, "@scope/legacy")
      assert.strictEqual(scoped.distribution.exports[0]?.variants[0]?.format, "CommonJS")
    }))

  it.effect("uses package-root index fallback when the projected distribution root is empty", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({ cwd: fixture, distributionDirectory: "" })
      const fallback = analysis.workspace.packages.find((pkg) => pkg.name === "fallback-package")!
      const root = fallback.distribution.exports.find((entry) => entry.subpath === ".")!
      assert.strictEqual(root.rule, "legacy")
      assert.strictEqual(root.variants[0]?.distributionPath, "packages/fallback/index.js")
    }))

  it.effect("agrees with the Node resolver for an independent legacy resolution matrix", () =>
    Effect.gen(function*() {
      const analysis = yield* analyze({ cwd: fixture })
      const pkg = analysis.workspace.packages.find((pkg) => pkg.name === "legacy-package")!
      const analyzedMatrix = pkg.distribution.exports.flatMap((entry) =>
        entry.variants.flatMap((variant) => {
          const modes: ReadonlyArray<OracleMode> = variant.resolutionMode === "Any"
            ? ["Import", "Require"]
            : [variant.resolutionMode]
          return modes.map((mode) => ({
            specifier: entry.specifier,
            mode,
            target: variant.distributionPath.replace("packages/legacy/", "")
          }))
        })
      )
      const bySpecifierAndMode = (left: { readonly specifier: string; readonly mode: OracleMode }, right: {
        readonly specifier: string
        readonly mode: OracleMode
      }) => left.specifier.localeCompare(right.specifier) || left.mode.localeCompare(right.mode)
      assert.deepStrictEqual(analyzedMatrix.sort(bySpecifierAndMode), [...oracleMatrix].sort(bySpecifierAndMode))

      const root = yield* Effect.sync(() => fs.mkdtempSync(path.join(os.tmpdir(), "effect-legacy-oracle-")))
      yield* Effect.gen(function*() {
        const packageRoot = path.join(root, "node_modules", pkg.name)
        yield* Effect.sync(() => {
          for (const file of sentinelFiles) {
            const absolute = path.join(packageRoot, file.target)
            fs.mkdirSync(path.dirname(absolute), { recursive: true })
            fs.writeFileSync(absolute, file.contents)
          }
        })

        const script = [
          "import { createRequire } from 'node:module'",
          "const require = createRequire(import.meta.url)",
          `const requests = ${JSON.stringify(oracleMatrix)}`,
          "const results = []",
          "for (const { specifier, mode, target } of requests) {",
          "  if (mode === 'Require') {",
          "    results.push({ kind: 'Resolved', value: require.resolve(specifier) })",
          "  } else if (target.endsWith('.node')) {",
          "    results.push({ kind: 'Resolved', value: import.meta.resolve(specifier) })",
          "  } else {",
          "    const loaded = target.endsWith('.json')",
          "      ? await import(specifier, { with: { type: 'json' } })",
          "      : await import(specifier)",
          "    results.push({ kind: 'Imported', value: target.endsWith('.json') ? loaded.default.sentinel : loaded.default })",
          "  }",
          "}",
          "process.stdout.write(JSON.stringify(results))"
        ].join("\n")
        const actual = yield* Effect.sync(() =>
          JSON.parse(execFileSync(process.execPath, [
            "--input-type=module",
            "--no-deprecation",
            "--eval",
            script
          ], { cwd: root, encoding: "utf8" })) as Array<
            { readonly kind: "Imported" | "Resolved"; readonly value: string }
          >
        )

        assert.deepStrictEqual(
          actual,
          oracleMatrix.map(({ mode, target }) =>
            mode === "Import" && !target.endsWith(".node")
              ? { kind: "Imported", value: target }
              : {
                kind: "Resolved",
                value: mode === "Import"
                  ? pathToFileURL(fs.realpathSync(path.join(root, "node_modules", pkg.name, target))).href
                  : fs.realpathSync(path.join(root, "node_modules", pkg.name, target))
              }
          )
        )
      }).pipe(Effect.ensuring(Effect.sync(() => fs.rmSync(root, { recursive: true, force: true }))))
    }))
})
