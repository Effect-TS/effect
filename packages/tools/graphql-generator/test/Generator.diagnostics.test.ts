/**
 * Diagnostics `generate` reports (EFF-1832 point 7, EFF-1834 points 4, 7 and
 * 11), one per family: the unmapped-scalars warning, config errors for scalar
 * keys, located errors in document files, recursive input objects (not
 * supported yet) and names generated code can't use. Also covers reading an
 * introspection JSON schema.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import {
  assertNoErrors,
  fileLines,
  type Generated,
  generateIn,
  generateTasks,
  taskConfig,
  warnings
} from "./utils/generator.ts"
import { fixture } from "./utils/model.ts"

const located = (generated: Generated) =>
  generated.result.diagnostics.map(({ column, line, message, severity }) => ({ severity, line, column, message }))

describe("Generator diagnostics", () => {
  it.effect("unmapped custom scalars decode as Schema.Json with one warning listing each one reached", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks({
        "src/a.graphql": "query A { tasks { bodyHTML } }",
        "src/b.graphql": "query B { tasks { bodyHTML due } }"
      })
      assertNoErrors(generated)
      assert.include(fileLines(generated.file("schema/app.graphql.ts")), "export const HTML = Schema.Json")
      assert.deepStrictEqual(warnings(generated).map((warning) => warning.message), [
        "Custom scalars without a mapping decode as Schema.Json: HTML. Map each one to a codec with `scalars` in the config."
      ])
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

  it.effect("a type-system definition in a document file is a located error", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks({
        "src/ops.graphql": "query A { tasks { id } }\n\ntype Extra {\n  a: Int\n}\n"
      })
      assert.deepStrictEqual(located(generated), [
        { severity: "error", line: 3, column: 1, message: `The "Extra" definition is not executable.` }
      ])
      assert.deepStrictEqual(generated.result.files, [])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a variable reaching a recursive input object is a located error", () =>
    Effect.gen(function*() {
      const generated = yield* generateIn({
        "schema.graphql": "input Tree { child: Tree name: String }\ntype Query { tree(t: Tree): Int }",
        "src/ops.graphql": "query E($t: Tree) { tree(t: $t) }"
      }, { schema: "./schema.graphql", documents: ["src/*.graphql"] })
      assert.deepStrictEqual(located(generated), [{
        severity: "error",
        line: 1,
        column: 9,
        message: `Variable "$t" uses the recursive input object "Tree"; recursive input objects are not supported yet.`
      }])
      assert.deepStrictEqual(generated.result.files, [])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a definition named like a binding of the generated module is a located error", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks({ "src/ops.graphql": "query Schema { tasks { id } }" })
      assert.deepStrictEqual(located(generated), [{
        severity: "error",
        line: 1,
        column: 7,
        message: `The name "Schema" is reserved in generated code; rename this definition.`
      }])
      assert.deepStrictEqual(generated.result.files, [])
    }).pipe(Effect.provide(NodeServices.layer)))
})

describe("Generator introspection JSON schema", () => {
  const search =
    `query Search($filter: SearchFilter, $limit: Int = 10) { now search(term: "x", filter: $filter, limit: $limit) }`

  it.effect("a .json schema generates the same files as its SDL, with the shared module named <schema>.graphql.ts", () =>
    Effect.gen(function*() {
      const fromJson = yield* generateIn(
        { "schema/modern.json": fixture("introspection/modern.json"), "src/search.graphql": search },
        { schema: "./schema/modern.json", documents: ["src/*.graphql"] }
      )
      const fromSdl = yield* generateIn(
        { "schema/modern.graphql": fixture("introspection/modern.graphql"), "src/search.graphql": search },
        { schema: "./schema/modern.graphql", documents: ["src/*.graphql"] }
      )
      assertNoErrors(fromJson)
      assert.deepStrictEqual(fromJson.paths, ["schema/modern.graphql.ts", "src/search.graphql.ts"])
      assert.deepStrictEqual(fromSdl.paths, fromJson.paths)
      for (const path of fromJson.paths) {
        assert.strictEqual(fromJson.file(path), fromSdl.file(path), path)
      }
    }).pipe(Effect.provide(NodeServices.layer)))
})
