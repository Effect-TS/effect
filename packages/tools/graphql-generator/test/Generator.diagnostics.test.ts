/**
 * Diagnostics `generate` reports (EFF-1832 point 7, EFF-1834 points 4, 7 and
 * 11): the single unmapped-scalars warning, config errors for scalar keys,
 * and located errors in document files.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { assertNoErrors, errors, generateTasks, taskConfig, warnings } from "./utils/generator.ts"

const occurrences = (text: string, word: string): number => text.match(new RegExp(`\\b${word}\\b`, "g"))?.length ?? 0

describe("Generator diagnostics", () => {
  it.effect("one warning lists each unmapped scalar the operations reach, once", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks({
        "src/a.graphql": "query A { tasks { bodyHTML } }",
        "src/b.graphql": "query B($filter: TaskFilter) { tasks(filter: $filter) { bodyHTML due } }"
      })
      assertNoErrors(generated)
      const found = warnings(generated)
      assert.strictEqual(found.length, 1)
      const message = found[0]!.message
      assert.strictEqual(occurrences(message, "HTML"), 1, message)
      assert.strictEqual(occurrences(message, "Markdown"), 1, message)
      assert.strictEqual(occurrences(message, "Blob"), 0, message)
      assert.strictEqual(occurrences(message, "Timestamp"), 0, message)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("no warning when every reached custom scalar is mapped", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks({ "src/a.graphql": "query A { tasks { id due } }" })
      assert.deepStrictEqual(generated.result.diagnostics, [])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a scalars key naming a type that isn't a scalar is a config error", () =>
    Effect.gen(function*() {
      const error = yield* generateTasks(
        { "src/a.graphql": "query A { tasks { id } }" },
        { ...taskConfig, scalars: { Task: "./scalars.ts#Task" } }
      ).pipe(Effect.flip)
      assert.strictEqual(error._tag, "ConfigError")
      assert.include(error.message, "Task")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a scalars key naming no type in the schema is a config error", () =>
    Effect.gen(function*() {
      const error = yield* generateTasks(
        { "src/a.graphql": "query A { tasks { id } }" },
        { ...taskConfig, scalars: { Nope: "./scalars.ts#Nope" } }
      ).pipe(Effect.flip)
      assert.strictEqual(error._tag, "ConfigError")
      assert.include(error.message, "Nope")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a type-system definition in a document file is a located error", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks({
        "src/ops.graphql": "query A { tasks { id } }\n\ntype Extra {\n  a: Int\n}\n"
      })
      const found = errors(generated)
      assert.strictEqual(found.length, 1)
      const { column, line, message, path } = found[0]!
      assert.deepStrictEqual({ line, column, message }, {
        line: 3,
        column: 1,
        message: `The "Extra" definition is not executable.`
      })
      assert.isTrue(path.endsWith("ops.graphql"), path)
    }).pipe(Effect.provide(NodeServices.layer)))
})
