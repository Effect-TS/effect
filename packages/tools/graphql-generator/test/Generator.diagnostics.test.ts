/**
 * Diagnostics `generate` reports (EFF-1832 point 7, EFF-1834 points 4, 7 and
 * 11): the single unmapped-scalars warning, config errors for scalar keys,
 * located errors in document files, the features deferred to stage 5 and
 * names generated code can't use. Also covers reading an introspection JSON
 * schema.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import {
  assertNoErrors,
  errors,
  type Generated,
  generateIn,
  generateTasks,
  taskConfig,
  warnings
} from "./utils/generator.ts"
import { fixture } from "./utils/model.ts"

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

const locatedErrors = (generated: Generated) =>
  generated.result.diagnostics.map(({ column, line, message, severity }) => ({ severity, line, column, message }))

const deferredSchema = `
interface Node { id: ID! }
type User implements Node { id: ID! name: String }
union Thing = User
input Pick @oneOf { a: Int b: String }
input Tree { child: Tree name: String }
type Query { node(id: ID!): Node user: User thing: Thing pick(p: Pick): Int tree(t: Tree): Int }
type Subscription { userChanged: User }
`

const unsupported = "interfaces and unions are not supported yet."

const deferredCases: ReadonlyArray<{
  readonly name: string
  readonly document: string
  readonly line: number
  readonly column: number
  readonly message: string
}> = [
  {
    name: "a field selecting from an interface",
    document: `query A { node(id: "1") { id } }`,
    line: 1,
    column: 11,
    message: `Field "node" selects from interface "Node"; ${unsupported}`
  },
  {
    name: "a field selecting from a union",
    document: "query A { thing { ... on User { id } } }",
    line: 1,
    column: 11,
    message: `Field "thing" selects from union "Thing"; ${unsupported}`
  },
  {
    name: "a fragment on an interface",
    document: "fragment NodeBits on Node { id }\nquery A { user { ...NodeBits } }",
    line: 1,
    column: 22,
    message: `Fragment "NodeBits" is on interface "Node"; ${unsupported}`
  },
  {
    name: "@include",
    document: "query B($show: Boolean!) { user { id name @include(if: $show) } }",
    line: 1,
    column: 43,
    message: "The @include directive is not supported yet."
  },
  {
    name: "@skip on a fragment spread",
    document:
      "query S($show: Boolean!) { user { id ...UserBits @skip(if: $show) } }\nfragment UserBits on User { name }",
    line: 1,
    column: 50,
    message: "The @skip directive is not supported yet."
  },
  {
    name: "a variable reaching a @oneOf input object",
    document: "query D($p: Pick) { pick(p: $p) }",
    line: 1,
    column: 9,
    message: `Variable "$p" uses the @oneOf input object "Pick"; @oneOf input objects are not supported yet.`
  },
  {
    name: "a variable reaching a recursive input object",
    document: "query E($t: Tree) { tree(t: $t) }",
    line: 1,
    column: 9,
    message: `Variable "$t" uses the recursive input object "Tree"; recursive input objects are not supported yet.`
  },
  {
    name: "a subscription",
    document: "subscription C { userChanged { id } }",
    line: 1,
    column: 1,
    message: `Subscription "C" is not supported yet.`
  }
]

describe("Generator features deferred to stage 5", () => {
  for (const { column, document, line, message, name } of deferredCases) {
    it.effect(`${name} is a located error and emits nothing`, () =>
      Effect.gen(function*() {
        const generated = yield* generateIn(
          { "schema.graphql": deferredSchema, "src/ops.graphql": document },
          { schema: "./schema.graphql", documents: ["src/*.graphql"] }
        )
        assert.deepStrictEqual(locatedErrors(generated), [{ severity: "error", line, column, message }])
        assert.deepStrictEqual(generated.result.files, [])
      }).pipe(Effect.provide(NodeServices.layer)))
  }
})

describe("Generator reserved names", () => {
  const reserved = (name: string) => `The name "${name}" is reserved in generated code; rename this definition.`
  const cases: ReadonlyArray<{ readonly document: string; readonly column: number; readonly message: string }> = [
    { document: "query Schema { tasks { id } }", column: 7, message: reserved("Schema") },
    {
      document: "fragment Shared on Task { id }\nquery A { tasks { ...Shared } }",
      column: 10,
      message: reserved("Shared")
    },
    { document: "query delete { tasks { id } }", column: 7, message: reserved("delete") },
    {
      document: "query OpsGroup { tasks { id } }",
      column: 7,
      message: `The name "OpsGroup" is taken by the group this file exports.`
    }
  ]
  for (const { column, document, message } of cases) {
    it.effect(document.split("\n")[0]!, () =>
      Effect.gen(function*() {
        const generated = yield* generateTasks({ "src/ops.graphql": document })
        assert.deepStrictEqual(locatedErrors(generated), [{ severity: "error", line: 1, column, message }])
        assert.deepStrictEqual(generated.result.files, [])
      }).pipe(Effect.provide(NodeServices.layer)))
  }
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
      assert.include(fromJson.file("schema/modern.graphql.ts"), "export class SearchFilter extends Schema.Opaque")
      assert.deepStrictEqual(warnings(fromJson).map((warning) => warning.path), ["schema/modern.json"])
    }).pipe(Effect.provide(NodeServices.layer)))
})
