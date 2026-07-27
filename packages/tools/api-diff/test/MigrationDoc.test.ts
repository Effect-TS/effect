import type { MigrationAnnotation } from "@effect/api-diff/Annotations"
import { renderMigrationDocument, renderMissingAnnotations } from "@effect/api-diff/MigrationDoc"
import type { ApiChange, ApiDiff } from "@effect/api-diff/Model"
import { assert, describe, it } from "@effect/vitest"

const change = (change: Partial<ApiChange> & Pick<ApiChange, "classification">): ApiChange => ({
  id: `change-${change.classification}-${change.baseApiId ?? change.headApiId}`,
  confidence: 1,
  authoritative: true,
  ...change
})

const diff: ApiDiff = {
  version: 1,
  base: { ref: "v3", sha: "a".repeat(40) },
  head: { ref: "main", sha: "b".repeat(40) },
  changes: [
    change({
      classification: "parameter-removed",
      baseApiId: "effect/Zeta#changed#value",
      headApiId: "effect/Zeta#changed#value",
      before: "declare const changed: (value: string) => string",
      after: "declare const changed: () => string"
    }),
    change({
      classification: "api-renamed",
      baseApiId: "effect/Alpha#oldName#value",
      headApiId: "effect/Alpha#newName#value"
    }),
    change({ classification: "api-removed", baseApiId: "effect/Alpha#oldName#value" }),
    change({
      classification: "api-removed",
      baseApiId: "effect/Beta#removed#value",
      before: "declare const removed: string"
    }),
    change({
      classification: "api-moved",
      baseApiId: "effect/Legacy#keptName#value",
      headApiId: "effect/Current#keptName#value"
    }),
    change({ classification: "api-removed", baseApiId: "effect/Legacy#keptName#value" }),
    change({ classification: "documentation-changed", baseApiId: "effect/Zeta#documented#value" }),
    change({
      classification: "parameter-added",
      baseApiId: "effect/Zeta#optional#value",
      headApiId: "effect/Zeta#optional#value",
      delta: {
        before: [],
        after: [{ name: "options", type: { kind: "primitive", name: "string" }, optional: true, rest: false }]
      }
    }),
    change({ classification: "api-added", headApiId: "effect/Zeta#added#value" })
  ]
}

const annotations = new Map<string, MigrationAnnotation>([
  ["effect/Alpha#oldName", {
    replacement: "Alpha.newName",
    note: "Use the renamed function."
  }]
])

describe("migration document", () => {
  it("renders the selected API changes deterministically", () => {
    const document = renderMigrationDocument(
      diff,
      annotations,
      "## Import Map\n\n```text\neffect/Alpha -> effect/Alpha\n```\n"
    )

    assert.strictEqual(
      document,
      [
        "<!-- dprint-ignore-file -->",
        "",
        "# v3 to v4 Migration Reference",
        "",
        `Base: \`v3\` (\`${"a".repeat(40)}\`)`,
        "",
        `Head: \`main\` (\`${"b".repeat(40)}\`)`,
        "",
        "This file is generated from the API diff and `migration/annotations/*.yaml`.",
        "",
        "## Import Map",
        "",
        "```text",
        "effect/Alpha -> effect/Alpha",
        "```",
        "",
        "## API Reference",
        "",
        "### `effect/Alpha`",
        "",
        "- `Alpha.oldName` -> `Alpha.newName`: Use the renamed function.",
        "",
        "### `effect/Beta`",
        "",
        "#### `Beta.removed`",
        "",
        "TODO: needs guidance",
        "",
        "**Before**",
        "",
        "```ts",
        "declare const removed: string",
        "```",
        "",
        "### `effect/Zeta`",
        "",
        "#### `Zeta.changed`",
        "",
        "TODO: needs guidance",
        "",
        "**Before**",
        "",
        "```ts",
        "declare const changed: (value: string) => string",
        "```",
        "",
        "**After**",
        "",
        "```ts",
        "declare const changed: () => string",
        "```",
        ""
      ].join("\n")
    )
    assert(!document.includes("keptName"))
    assert(!document.includes("documented"))
    assert(!document.includes("optional"))
    assert(!document.includes("added"))
  })

  it("lists unannotated ids grouped by module", () => {
    assert.strictEqual(
      renderMissingAnnotations(diff, annotations),
      "effect/Beta:\n  - effect/Beta#removed\neffect/Zeta:\n  - effect/Zeta#changed\n"
    )
  })

  it("renders guidance and examples for detailed changes", () => {
    const document = renderMigrationDocument(
      diff,
      new Map([...annotations, ["effect/Zeta#changed", {
        replacement: "Zeta.changed()",
        note: "Call the zero-argument form.",
        example: "Zeta.changed()"
      }]]),
      "## Import Map\n"
    )

    assert(document.includes("**Replacement:** `Zeta.changed()`"))
    assert(document.includes("Call the zero-argument form."))
    assert(document.includes("**Example**\n\n```ts\nZeta.changed()\n```"))
  })

  it("retains annotated removals that also have move suggestions", () => {
    const serviceDiff: ApiDiff = {
      ...diff,
      changes: [
        change({
          classification: "api-moved",
          baseApiId: "effect/Effect#Service#value",
          headApiId: "effect/Context#Service#value",
          authoritative: false
        }),
        change({
          classification: "api-removed",
          baseApiId: "effect/Effect#Service#value",
          before: "declare const Service: unknown"
        })
      ]
    }
    const document = renderMigrationDocument(
      serviceDiff,
      new Map([["effect/Effect#Service", {
        replacement: "Context.Service",
        note: "Use the v4 service constructor."
      }]]),
      "## Import Map\n"
    )

    assert(document.includes("#### `Effect.Service`"))
    assert(document.includes("**Replacement:** `Context.Service`"))
  })
})
