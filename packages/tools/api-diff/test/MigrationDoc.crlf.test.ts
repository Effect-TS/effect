import type { MigrationAnnotation } from "@effect/api-diff/Annotations"
import {
  extractImportMapSections,
  markdownSafetyIssues,
  renderMigrationDocument,
  renderMissingAnnotations,
  unannotatedApiIds,
  unannotatedModuleIds
} from "@effect/api-diff/MigrationDoc"
import type { ApiChange, ApiDiff } from "@effect/api-diff/Model"
import { assert, describe, it } from "@effect/vitest"

const change = (input: Partial<ApiChange> & Pick<ApiChange, "classification">): ApiChange => ({
  id: `${input.classification}:${input.baseApiId ?? input.headApiId ?? "module"}`,
  confidence: 1,
  authoritative: true,
  ...input
})

const changes: ReadonlyArray<ApiChange> = [
  change({ classification: "module-removed", delta: { from: "effect/Legacy", to: [] } }),
  change({
    classification: "api-removed",
    baseApiId: "effect/Legacy#unchanged#value",
    before: "declare const unchanged: string"
  }),
  change({
    classification: "api-added",
    headApiId: "effect/Current#unchanged#value",
    after: "declare const unchanged: string"
  })
]
const annotations = new Map<string, MigrationAnnotation>()
const variants = [
  { name: "bare", maps: ["effect/Legacy -> effect/Current"], targets: "`effect/Current`", moved: false },
  {
    name: "barrel",
    maps: ["effect/Legacy -> effect/Current (barrel: effect)"],
    targets: "`effect/Current`",
    moved: false
  },
  {
    name: "split",
    maps: ["effect/Legacy -> effect/Other", "effect/Legacy -> effect/Current (barrel: effect)"],
    targets: "`effect/Other`, `effect/Current`",
    moved: false
  },
  {
    name: "repeated",
    maps: ["effect/Legacy -> effect/Current", "effect/Legacy -> effect/Current (barrel: effect)"],
    targets: "`effect/Current`",
    moved: false
  },
  { name: "move suggestion", maps: ["effect/Legacy -> effect/Current"], targets: "`effect/Current`", moved: true }
]

const check = (name: string, actual: unknown, expected: unknown): void => {
  console.log("R11_ASSERT", JSON.stringify({ name, actual, expected }))
  assert.deepStrictEqual(actual, expected)
}

describe("import-map line endings", () => {
  for (const variant of variants) {
    const diff: ApiDiff = {
      version: 1,
      base: { ref: "v3", sha: "a".repeat(40) },
      head: { ref: "main", sha: "b".repeat(40) },
      changes: variant.moved
        ? [
          ...changes,
          change({
            classification: "api-moved",
            baseApiId: "effect/Legacy#unchanged#value",
            headApiId: "effect/Current#unchanged#value",
            authoritative: false
          })
        ]
        : changes
    }
    for (const ending of ["LF", "CRLF", "mixed"]) {
      const eol = ending === "LF" ? "\n" : "\r\n"
      const lines = [
        "## Import Map",
        "",
        "```text",
        ...variant.maps,
        "```",
        "",
        "## No Counterpart Imports",
        "",
        "None."
      ]
      const authored = lines.join(eol)
      const section = ending === "mixed" ? authored.replace("## Import Map\r\n", "## Import Map\n") : authored
      const existing =
        `# Existing reference${eol}${section}${eol}${eol}## Removed Modules${eol}Old guidance.${eol}## API Reference${eol}Old APIs.`
      const extracted = extractImportMapSections(existing)
      const document = renderMigrationDocument(diff, annotations, extracted)
      const expected = [
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
        section,
        "",
        "## Removed Modules",
        "",
        `- \`effect/Legacy\` -> ${variant.targets}`,
        "",
        "## API Reference",
        ""
      ].join("\n")
      const name = `${variant.name} ${ending}`
      it(`${name}: extracted authored bytes`, () => check(name, extracted, `${section}\n`))
      it(`${name}: exact rendered document`, () => check(name, document, expected))
      it(`${name}: missing modules`, () => check(name, unannotatedModuleIds(diff, annotations, extracted), []))
      it(`${name}: missing APIs`, () => check(name, [...unannotatedApiIds(diff, annotations, extracted)], []))
      it(`${name}: missing guidance report`, () =>
        check(
          name,
          renderMissingAnnotations(diff, annotations, extracted),
          "All migration APIs and removed modules have guidance.\n"
        ))
      it(`${name}: Markdown safety`, () => check(name, markdownSafetyIssues(document), []))
    }
  }
})
