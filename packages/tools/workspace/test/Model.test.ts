import { assert, describe, it } from "@effect/vitest"
import {
  DistributionIssue,
  ExportTarget,
  StructuralDiagnostic,
  Workspace,
  WorkspaceAnalysisError
} from "@effect/workspace"
import * as Schema from "effect/Schema"

const roundTrip = (schema: Schema.Codec<any, any, never>, encoded: unknown) => {
  const decoded = Schema.decodeUnknownSync(schema)(encoded)
  assert.deepStrictEqual(Schema.encodeSync(schema)(decoded), encoded)
}

describe("workspace model", () => {
  it("round trips the portable domain variants and recursive export targets", () => {
    roundTrip(Workspace, {
      packages: [
        {
          name: "@scope/package",
          version: "1.0.0",
          path: "packages/package",
          distribution: {
            packageType: "Module",
            main: "./dist/index.js",
            exportsMode: "Exports",
            rules: [
              {
                _tag: "ExactExportRule",
                subpath: ".",
                target: {
                  _tag: "Conditions",
                  entries: [
                    { condition: "import", target: { _tag: "Target", value: "./dist/index.js" } },
                    {
                      condition: "default",
                      target: {
                        _tag: "Fallback",
                        targets: [
                          { _tag: "Null" },
                          { _tag: "Target", value: "./dist/index.cjs" }
                        ]
                      }
                    }
                  ]
                }
              }
            ],
            exports: [
              {
                specifier: "@scope/package",
                subpath: ".",
                rule: ".",
                variants: [
                  {
                    distributionPath: "packages/package/dist/index.js",
                    kind: "JavaScript",
                    resolutionMode: "Import",
                    format: "Module",
                    conditionPath: ["import"],
                    fallbackPositions: [],
                    provenance: {
                      _tag: "Resolved",
                      sourcePath: "packages/package/src/index.ts"
                    }
                  },
                  {
                    distributionPath: "packages/package/package.json",
                    kind: "Resource",
                    resolutionMode: "Any",
                    format: "Json",
                    conditionPath: ["default"],
                    fallbackPositions: [1],
                    provenance: { _tag: "NotRequired" }
                  }
                ]
              }
            ]
          }
        },
        {
          name: "public-package",
          version: "1.0.0",
          path: "packages/public",
          distribution: {
            packageType: "CommonJS",
            exportsMode: "Exports",
            rules: [
              {
                _tag: "PatternExportRule",
                subpath: "./*",
                target: { _tag: "Target", value: "./dist/*.js" }
              }
            ],
            exports: [
              {
                specifier: "public-package/missing",
                subpath: "./missing",
                rule: "./*",
                variants: [
                  {
                    distributionPath: "packages/public/dist/missing.js",
                    kind: "JavaScript",
                    resolutionMode: "Any",
                    format: "CommonJS",
                    conditionPath: [],
                    fallbackPositions: [],
                    provenance: { _tag: "Missing", modulePath: "missing" }
                  },
                  {
                    distributionPath: "packages/public/dist/ambiguous.js",
                    kind: "JavaScript",
                    resolutionMode: "Any",
                    format: "CommonJS",
                    conditionPath: [],
                    fallbackPositions: [],
                    provenance: {
                      _tag: "Ambiguous",
                      modulePath: "ambiguous",
                      candidates: [
                        "packages/public/src/ambiguous.ts",
                        "packages/public/src/ambiguous.tsx"
                      ]
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    })
  })

  it("round trips every Distribution Issue variant", () => {
    const common = { packageName: "pkg", packagePath: "packages/pkg" }
    const issues = [
      { _tag: "StalePatternRule", code: "stale-pattern-rule", ...common, rule: "./*" },
      {
        _tag: "ExactJavaScriptTargetMissingSource",
        code: "exact-javascript-target-missing-source",
        ...common,
        rule: ".",
        target: "./dist/index.js",
        modulePath: "index"
      },
      {
        _tag: "ExactJavaScriptTargetAmbiguousSource",
        code: "exact-javascript-target-ambiguous-source",
        ...common,
        rule: ".",
        target: "./dist/index.js",
        modulePath: "index",
        candidates: ["packages/pkg/src/index.ts", "packages/pkg/src/index.tsx"]
      },
      {
        _tag: "JavaScriptExportMissingSource",
        code: "javascript-export-missing-source",
        ...common,
        specifier: "pkg/foo",
        distributionPath: "packages/pkg/dist/foo.js",
        modulePath: "foo"
      },
      {
        _tag: "JavaScriptExportAmbiguousSource",
        code: "javascript-export-ambiguous-source",
        ...common,
        specifier: "pkg/foo",
        distributionPath: "packages/pkg/dist/foo.js",
        modulePath: "foo",
        candidates: ["packages/pkg/src/foo.ts", "packages/pkg/src/foo.tsx"]
      },
      {
        _tag: "IncompatiblePackageExport",
        code: "incompatible-package-export",
        ...common,
        specifier: "pkg/foo",
        rules: ["./*", "./foo"]
      },
      {
        _tag: "DuplicatePackageTarget",
        code: "duplicate-package-target",
        ...common,
        distributionPath: "packages/pkg/dist/index.js",
        specifiers: ["pkg", "pkg/index"]
      },
      {
        _tag: "InvalidPackageTarget",
        code: "invalid-package-target",
        ...common,
        rule: "./foo",
        target: "dependency/foo",
        reason: "target is not package-relative"
      },
      {
        _tag: "TargetEscapesPackage",
        code: "target-escapes-package",
        ...common,
        rule: "./foo",
        target: "./dist/../../foo.js"
      },
      {
        _tag: "InvalidWildcardSubstitution",
        code: "invalid-wildcard-substitution",
        ...common,
        rule: "./*",
        substitution: "../foo",
        reason: "substitution escapes the package subpath"
      },
      {
        _tag: "PackageExportNoUsableTarget",
        code: "package-export-no-usable-target",
        ...common,
        specifier: "pkg/foo"
      },
      {
        _tag: "EffectiveMainNoRootSurface",
        code: "effective-main-no-root-surface",
        ...common,
        main: "./dist/missing.js"
      }
    ]

    for (const issue of issues) {
      roundTrip(DistributionIssue, issue)
    }
  })

  it("round trips every package type, resolution mode, format, and Resource provenance", () => {
    const formats = ["Module", "CommonJS", "Json", "Native", "Unknown"] as const
    const modes = ["Import", "Require", "Any"] as const
    roundTrip(Workspace, {
      packages: ["Module", "CommonJS", "Unspecified"].map((packageType, packageIndex) => ({
        name: `package-${packageIndex}`,
        version: "1.0.0",
        path: `packages/package-${packageIndex}`,
        distribution: {
          packageType,
          exportsMode: "Legacy",
          rules: [],
          exports: [{
            specifier: `package-${packageIndex}`,
            subpath: ".",
            rule: "legacy",
            variants: formats.map((format, index) => ({
              distributionPath: `packages/package-${packageIndex}/dist/file-${index}.data`,
              kind: "Resource",
              resolutionMode: modes[index % modes.length],
              format,
              conditionPath: [],
              fallbackPositions: [],
              provenance: index % 2 === 0
                ? { _tag: "Resolved", sourcePath: `packages/package-${packageIndex}/src/file-${index}.data` }
                : {
                  _tag: "Ambiguous",
                  modulePath: `file-${index}`,
                  candidates: [
                    `packages/package-${packageIndex}/src/file-${index}.a`,
                    `packages/package-${packageIndex}/src/file-${index}.b`
                  ]
                }
            }))
          }]
        }
      }))
    })
  })

  it("round trips every structural diagnostic variant", () => {
    const diagnostics = [
      { _tag: "WorkspaceRootNotFound", cwd: "/repo/packages/pkg" },
      { _tag: "WorkspaceMembershipUnavailable", root: "/repo", message: "cannot read workspace manifest" },
      { _tag: "PackageManifestUnavailable", packagePath: "packages/pkg", message: "invalid JSON" },
      { _tag: "InvalidPackageName", packagePath: "packages/pkg" },
      { _tag: "DuplicatePackageName", name: "pkg", packagePaths: ["packages/a", "packages/b"] },
      { _tag: "InvalidPackageVersion", name: "pkg", packagePath: "packages/pkg" },
      { _tag: "MalformedExports", name: "pkg", packagePath: "packages/pkg", message: "mixed keys" },
      { _tag: "InvalidWorkspaceDirectory", option: "sourceDirectory", value: "../shared" }
    ]

    for (const diagnostic of diagnostics) {
      roundTrip(StructuralDiagnostic, diagnostic)
    }

    roundTrip(WorkspaceAnalysisError, {
      _tag: "WorkspaceAnalysisError",
      diagnostics: [diagnostics[3]]
    })
  })

  it("enforces portable paths and tagged data invariants", () => {
    for (const path of ["/absolute/path", "../outside", "packages\\pkg", "packages/./pkg", "packages//pkg"]) {
      assert.throws(() =>
        Schema.decodeUnknownSync(Workspace)({
          packages: [{
            name: "pkg",
            version: "1.0.0",
            path,
            distribution: {
              packageType: "Unspecified",
              exportsMode: "Legacy",
              rules: [],
              exports: []
            }
          }]
        })
      )
    }

    assert.throws(() =>
      Schema.decodeUnknownSync(Workspace)({
        packages: [{
          name: "pkg",
          version: "",
          path: "packages/pkg",
          distribution: {
            packageType: "Unspecified",
            exportsMode: "Legacy",
            rules: [],
            exports: []
          }
        }]
      })
    )
    assert.throws(() =>
      Schema.decodeUnknownSync(Workspace)({
        packages: [{
          name: "pkg",
          version: "1.0.0",
          path: "packages/pkg",
          distribution: {
            packageType: "Unspecified",
            exportsMode: "Exports",
            rules: [],
            exports: [{
              specifier: "pkg",
              subpath: ".",
              rule: ".",
              variants: [{
                distributionPath: "packages/pkg/dist/index.js",
                kind: "JavaScript",
                resolutionMode: "Any",
                format: "Unknown",
                conditionPath: [],
                fallbackPositions: [],
                provenance: { _tag: "NotRequired" }
              }]
            }]
          }
        }]
      })
    )
    assert.throws(() => Schema.decodeUnknownSync(ExportTarget)({ _tag: "Unknown" }))
    roundTrip(Workspace, {
      packages: [{
        name: "empty-module-path",
        version: "1.0.0",
        path: "packages/empty",
        distribution: {
          packageType: "Unspecified",
          exportsMode: "Exports",
          rules: [],
          exports: [{
            specifier: "empty-module-path",
            subpath: ".",
            rule: ".",
            variants: [{
              distributionPath: "packages/empty/dist/.js",
              kind: "JavaScript",
              resolutionMode: "Any",
              format: "Unknown",
              conditionPath: [],
              fallbackPositions: [],
              provenance: { _tag: "Missing", modulePath: "" }
            }]
          }]
        }
      }]
    })
  })
})
