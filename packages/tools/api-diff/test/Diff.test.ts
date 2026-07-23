import { diffSnapshots } from "@effect/api-diff/Diff"
import type { ApiEntity, ApiSnapshot, DeclarationModel, MigrationMap } from "@effect/api-diff/Model"
import { renderMarkdownReport } from "@effect/api-diff/Report"
import { assert, describe, it } from "@effect/vitest"

const entity = (
  module: string,
  name: string,
  declaration: DeclarationModel,
  hash: string
): ApiEntity => ({
  id: `${module}#${name}#value`,
  packageName: module.split("/")[0]!,
  module,
  path: [name],
  bucket: "value",
  declarationKind: declaration.kind,
  importRoutes: [{ module, path: [name] }],
  declarations: [declaration],
  displaySignature: `declare const ${name}: unknown`,
  fingerprint: hash,
  documentation: { stability: "stable" },
  source: { file: `${name}.d.ts`, line: 1, column: 1 }
})

const snapshot = (ref: string, entities: ReadonlyArray<ApiEntity>): ApiSnapshot => ({
  version: 1,
  compiler: { name: "typescript", version: "fixture" },
  ref,
  sha: ref.repeat(40).slice(0, 40),
  packages: ["old", "new"],
  entrypoints: [],
  entities,
  diagnostics: []
})

describe("snapshot diff", () => {
  it("matches renames, classifies signature changes, and separates suggestions", () => {
    const base = snapshot("a", [
      entity("old/A", "renamed", {
        kind: "function",
        name: "renamed",
        parameters: [{ name: "value", type: { kind: "primitive", name: "string" }, optional: false, rest: false }],
        returnType: { kind: "primitive", name: "string" }
      }, "same"),
      entity("old/A", "similarName", {
        kind: "variable",
        name: "similarName",
        type: { kind: "primitive", name: "string" }
      }, "x"),
      entity(
        "old/A",
        "removed",
        { kind: "variable", name: "removed", type: { kind: "primitive", name: "string" } },
        "r"
      )
    ])
    const head = snapshot("b", [
      entity("new/A", "replacement", {
        kind: "function",
        name: "replacement",
        parameters: [
          { name: "value", type: { kind: "primitive", name: "string" }, optional: false, rest: false },
          { name: "count", type: { kind: "primitive", name: "number" }, optional: true, rest: false }
        ],
        returnType: { kind: "primitive", name: "number" }
      }, "different"),
      entity("new/A", "similarNames", {
        kind: "variable",
        name: "similarNames",
        type: { kind: "primitive", name: "number" }
      }, "y"),
      entity("new/A", "added", { kind: "variable", name: "added", type: { kind: "primitive", name: "string" } }, "a")
    ])
    const mapping: MigrationMap = {
      version: 1,
      modules: [{ from: "old/A", to: ["new/A"], status: "moved" }],
      apis: [{
        from: { module: "old/A", path: ["renamed"] },
        to: { module: "new/A", path: ["replacement"] }
      }]
    }
    const diff = diffSnapshots(base, head, mapping, [])
    assert(diff.changes.some((change) => change.classification === "api-renamed" && change.authoritative))
    assert(diff.changes.some((change) => change.classification === "parameter-added"))
    assert(diff.changes.some((change) => change.classification === "return-type-changed"))
    assert(diff.changes.some((change) => change.baseApiId?.includes("similarName") && !change.authoritative))
    assert(diff.changes.some((change) => change.classification === "api-removed"))
    assert(diff.changes.some((change) => change.classification === "api-added"))
    const report = renderMarkdownReport(diff)
    assert(report.includes("Suggested matches requiring review"))
    assert(report.includes(base.sha))
    assert.deepStrictEqual(diff, diffSnapshots(base, head, mapping, []))
  })

  it("classifies overload and parameter reordering", () => {
    const signature = (name: string, parameters: ReadonlyArray<"left" | "right">): DeclarationModel => ({
      kind: "function",
      name,
      parameters: parameters.map((parameter) => ({
        name: parameter,
        type: { kind: "primitive", name: "string" },
        optional: false,
        rest: false
      })),
      returnType: { kind: "primitive", name: "string" }
    })
    const before = entity("old/A", "ordered", signature("ordered", ["left", "right"]), "before")
    const after = entity("new/A", "ordered", signature("ordered", ["right", "left"]), "after")
    const diff = diffSnapshots(
      snapshot("a", [before]),
      snapshot("b", [after]),
      {
        version: 1,
        modules: [{ from: "old/A", to: ["new/A"], status: "moved" }],
        apis: []
      },
      []
    )
    assert(diff.changes.some((change) => change.classification === "parameter-reordered"))
  })
})
