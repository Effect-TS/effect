import { decodeMigrationMap, renderMigrationMarkdown, validateMigrationMap } from "@effect/api-diff/Mapping"
import type { MigrationMap } from "@effect/api-diff/Model"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"

const mapping: MigrationMap = {
  version: 1,
  modules: [
    { from: "old/A", to: ["new/A", "new/B"], status: "split", barrels: ["new"] },
    { to: ["new/C"], status: "added" }
  ],
  apis: [
    {
      from: { module: "old/A", path: ["catchSome"] },
      to: { module: "new/A", path: ["catchFilter"] }
    }
  ]
}

describe("migration mapping", () => {
  it("renders one-to-many and added modules", () => {
    const markdown = renderMigrationMarkdown(mapping)
    assert(markdown.includes("old/A -> new/A, new/B (barrel: new)"))
    assert(markdown.includes("new/C"))
    assert(markdown.includes("A.catchSome -> A.catchFilter"))
  })

  it("renders APIs as grep-friendly code spellings", () => {
    const markdown = renderMigrationMarkdown({
      version: 1,
      modules: [],
      apis: [
        {
          from: { module: "effect/Effect", path: ["makeLatch"] },
          to: { module: "effect/Latch", path: ["make"] }
        },
        {
          from: { module: "effect/Stream", path: ["Stream", "Context"] },
          to: { module: "effect/Stream", path: ["Services"] }
        },
        {
          from: { module: "effect/Mailbox", path: ["Mailbox"] },
          to: { module: "effect/Queue", path: ["Queue"] }
        }
      ]
    })
    assert(markdown.includes("Effect.makeLatch -> Latch.make"))
    assert(markdown.includes("Stream.Context -> Stream.Services"))
    assert(markdown.includes("Mailbox -> Queue.Queue"))
  })

  it("rejects duplicate sources and contradictory statuses", () => {
    const diagnostics = validateMigrationMap({
      ...mapping,
      modules: [
        ...mapping.modules,
        { from: "old/A", to: [], status: "removed" },
        { from: "old/Invalid", to: ["new/Invalid"], status: "removed" }
      ],
      apis: [...mapping.apis, mapping.apis[0]!]
    })
    assert(diagnostics.some((diagnostic) => diagnostic.code === "duplicate-module-source"))
    assert(diagnostics.some((diagnostic) => diagnostic.code === "contradictory-module-status"))
    assert(diagnostics.some((diagnostic) => diagnostic.code === "duplicate-api-source"))
  })

  it("detects the conflicting catchSome guide", () => {
    const diagnostics = validateMigrationMap({
      ...mapping,
      apis: [{
        ...mapping.apis[0]!,
        guide: "guide.md"
      }]
    }, {
      guideSources: new Map([["guide.md", "| `Effect.catchSome` | `Effect.catchIf` |\n"]])
    })
    assert(diagnostics.some((diagnostic) => diagnostic.code === "contradictory-guide"))
  })

  it.effect("keeps the repository Markdown generated from the structured map", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const jsonPath = yield* path.fromFileUrl(new URL("../../../../migration/v3-to-v4.json", import.meta.url))
      const markdownPath = yield* path.fromFileUrl(new URL("../../../../migration/v3-to-v4.md", import.meta.url))
      const parsed = yield* decodeMigrationMap(yield* fs.readFileString(jsonPath))
      assert.strictEqual(renderMigrationMarkdown(parsed), yield* fs.readFileString(markdownPath))
      assert.strictEqual(validateMigrationMap(parsed).length, 0)
      const catchSome = parsed.apis.find((entry) =>
        entry.from.module === "effect/Effect" && entry.from.path.join(".") === "catchSome"
      )
      assert.deepStrictEqual(catchSome?.to, {
        module: "effect/Effect",
        path: ["catchFilter"]
      })
    }).pipe(Effect.provide(NodeServices.layer)))
})
