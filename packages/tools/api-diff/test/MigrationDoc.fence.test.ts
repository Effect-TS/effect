import { loadAnnotations } from "@effect/api-diff/Annotations"
import {
  markdownSafetyIssues,
  renderMigrationDocument,
  renderMissingAnnotations,
  unannotatedApiIds,
  unannotatedModuleIds
} from "@effect/api-diff/MigrationDoc"
import type { ApiChange, ApiDiff } from "@effect/api-diff/Model"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"

const change = (input: Partial<ApiChange> & Pick<ApiChange, "classification">): ApiChange => ({
  id: `${input.classification}:${input.baseApiId ?? "module"}`,
  confidence: 1,
  authoritative: true,
  ...input
})
const diff: ApiDiff = {
  version: 1,
  base: { ref: "v3", sha: "a".repeat(40) },
  head: { ref: "main", sha: "b".repeat(40) },
  changes: [
    change({ classification: "api-removed", baseApiId: "effect/Fixture#removed#type" }),
    change({ classification: "api-removed", baseApiId: "effect/Fixture#removed#value" }),
    change({ classification: "module-removed", delta: { from: "effect/Gone", to: [] } }),
    change({ classification: "api-removed", baseApiId: "effect/Gone#covered#value" }),
    change({ classification: "module-removed", delta: { from: "effect/Split", to: [] } }),
    change({ classification: "api-removed", baseApiId: "effect/Split#removed#value" })
  ]
}
const examples = [
  { name: "plain", example: "const value = 1", fence: "```" },
  { name: "empty", example: "", fence: "```" },
  { name: "single inline", example: "const value = `text`", fence: "```" },
  { name: "double inline", example: "const value = 1 // ``literal``", fence: "```" },
  {
    name: "triple comment fence",
    example: ["const value = 1", "/*", "```text", "Literal fenced Markdown.", "```", "*/", "value.toFixed()"].join(
      "\n"
    ),
    fence: "````"
  },
  {
    name: "four comment fence",
    example: ["const value = 1", "/*", "````text", "Literal fenced Markdown.", "````", "*/", "value.toFixed()"].join(
      "\n"
    ),
    fence: "`````"
  },
  {
    name: "longest later run",
    example: ["const value = `text`", "/*", "```text", "`````", "```", "*/", "value.toUpperCase()"].join("\n"),
    fence: "``````"
  }
]

const check = (name: string, actual: unknown, expected: unknown): void => {
  console.log("R11_ASSERT", JSON.stringify({ name, actual, expected }))
  assert.deepStrictEqual(actual, expected)
}

const load = (example: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const root = yield* fs.makeTempDirectoryScoped({ prefix: "r11-example-" })
    const yaml = [
      "effect/Fixture#removed:",
      "  replacement: Fixture.current",
      "  note: Use the current export.",
      "  example: |-",
      ...example.split("\n").map((line) => `    ${line}`),
      "effect/Gone:",
      "  replacement: none",
      "  note: The module was removed.",
      "effect/Split#removed:",
      "  replacement: Current.removed",
      "  note: Follow the per-API replacement.",
      ""
    ].join("\n")
    yield* fs.writeFileString(path.join(root, "Fixture.yaml"), yaml)
    const annotations = yield* loadAnnotations(root)
    console.log("R11_LOADED", JSON.stringify({ yaml, annotations: [...annotations] }))
    return { annotations, root }
  }).pipe(Effect.scoped)

describe("loaded migration example framing", () => {
  for (const { example, fence, name } of examples) {
    for (
      const oracle of [
        "loaded bytes",
        "cleanup",
        "exact document",
        "outer fence",
        "single entry",
        "safety",
        "selection"
      ]
    ) {
      it.effect(`${name}: ${oracle}`, () =>
        Effect.gen(function*() {
          // Close the owned filesystem scope before any assertion can fail.
          const { annotations, root } = yield* load(example)
          const fs = yield* FileSystem.FileSystem
          const document = renderMigrationDocument(diff, annotations, "## Import Map\n")
          console.log(
            "R11_DOCUMENT",
            JSON.stringify({ name, oracle, document, issues: markdownSafetyIssues(document) })
          )
          switch (oracle) {
            case "loaded bytes":
              check(name, annotations.get("effect/Fixture#removed")?.example, example)
              break
            case "cleanup":
              check(name, yield* fs.exists(root), false)
              break
            case "exact document":
              check(
                name,
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
                  "## Removed Modules",
                  "",
                  "- `effect/Gone` -> `none`: The module was removed.",
                  "- `effect/Split`: No single module replacement; follow the curated per-API guidance below.",
                  "",
                  "## API Reference",
                  "",
                  "### `effect/Fixture`",
                  "",
                  "#### `Fixture.removed`",
                  "",
                  "**Replacement:** `Fixture.current`",
                  "",
                  "Use the current export.",
                  "",
                  "**Example**",
                  "",
                  `${fence}ts`,
                  example,
                  fence,
                  "",
                  "### `effect/Split`",
                  "",
                  "- `Split.removed` -> `Current.removed`: Follow the per-API replacement.",
                  ""
                ].join("\n")
              )
              break
            case "outer fence":
              check(name, [
                [...document.matchAll(/^(`{3,})ts$/gm)].map((match) => match[1]),
                document.split(`\n${fence}\n`).length - 1
              ], [[fence], 1])
              break
            case "single entry":
              check(name, document.match(/^#### .+$/gm), ["#### `Fixture.removed`"])
              break
            case "safety":
              check(name, markdownSafetyIssues(document), [])
              break
            case "selection":
              check(name, [
                [...unannotatedApiIds(diff, annotations)],
                unannotatedModuleIds(diff, annotations, ""),
                renderMissingAnnotations(diff, annotations),
                document.includes("Gone.covered"),
                document.includes("- `Split.removed` -> `Current.removed`: Follow the per-API replacement.")
              ], [[], [], "All migration APIs and removed modules have guidance.\n", false, true])
              break
          }
        }).pipe(Effect.provide(NodeServices.layer)))
    }
  }
})
