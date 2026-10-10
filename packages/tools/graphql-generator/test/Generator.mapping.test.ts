/**
 * GraphQL to Schema mapping rules (EFF-1832 points 1 to 10) and scalar
 * specifiers (EFF-1834 points 5 to 7), asserted on the text `generate` emits
 * for `taskSchemaSdl`. Results and variables live in `src/ops.graphql.ts`;
 * scalars, enums and input objects in the shared module, by default
 * `schema/app.graphql.ts` next to the schema.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import {
  assertDeclaredInOrder,
  assertNoErrors,
  declaration,
  declarationDoc,
  declares,
  docOf,
  fileLines,
  generateTasks,
  member,
  members,
  taskConfig
} from "./utils/generator.ts"

const operations = `
query Tasks($filter: TaskFilter, $first: Int! = 20, $after: String, $taskId: ID!) {
  __typename
  tasks(filter: $filter, first: $first, after: $after) {
    id
    title
    done
    estimate
    subtaskCount
    priority
    override
    due
    bodyHTML
    labels
    tagNames
    hours
  }
  task(id: $taskId) {
    __typename
    heading: title
  }
}
`

const generate = (config = taskConfig) =>
  generateTasks({ "src/ops.graphql": operations }, config).pipe(
    Effect.map((generated) => {
      assertNoErrors(generated)
      return {
        ops: generated.file("src/ops.graphql.ts"),
        shared: generated.file("schema/app.graphql.ts"),
        generated
      }
    })
  )

describe("Generator mapping rules", () => {
  it.effect("1. nullable result fields are NullOr with a required key; non-null fields are unwrapped", () =>
    Effect.gen(function*() {
      const { ops } = yield* generate()
      assert.strictEqual(member(ops, "estimate"), "Schema.NullOr(Shared.Float)")
      assert.strictEqual(member(ops, "task"), "Schema.NullOr(Schema.Struct({")
      assert.strictEqual(member(ops, "title"), "Schema.String")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("2. lists follow GraphQL nullability at every level with the readonly Schema.Array", () =>
    Effect.gen(function*() {
      const { ops, shared } = yield* generate()
      assert.strictEqual(member(ops, "labels"), "Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))")
      assert.strictEqual(member(ops, "tagNames"), "Schema.Array(Schema.String)")
      assert.strictEqual(member(ops, "hours"), "Schema.Array(Schema.NullOr(Schema.Array(Shared.Int)))")
      assert.strictEqual(member(ops, "tasks"), "Schema.Array(Schema.Struct({")
      assert.strictEqual(member(shared, "tags"), "Schema.optional(Schema.NullOr(Schema.Array(TagMatch)))")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("3. nullable variables and input fields are optional(NullOr(T))", () =>
    Effect.gen(function*() {
      const { ops, shared } = yield* generate()
      assert.strictEqual(member(ops, "filter"), "Schema.optional(Schema.NullOr(Shared.TaskFilter))")
      assert.strictEqual(member(ops, "after"), "Schema.optional(Schema.NullOr(Schema.String))")
      assert.strictEqual(member(ops, "taskId"), "Shared.ID")
      assert.strictEqual(member(shared, "dueBefore"), "Schema.optional(Schema.NullOr(Timestamp))")
      assert.strictEqual(member(shared, "name"), "Schema.String")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("4. non-null with a default is optional(T) and keeps the default as @default", () =>
    Effect.gen(function*() {
      const { ops, shared } = yield* generate()
      assert.strictEqual(member(ops, "first"), "Schema.optional(Shared.Int)")
      assert.include(docOf(ops, "first"), "@default 20")
      assert.strictEqual(member(shared, "minTags"), "Schema.optional(Int)")
      assert.include(docOf(shared, "minTags"), "How many tags must match.")
      assert.include(docOf(shared, "minTags"), "@default 1")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("5. Int, Float and ID come from the shared module; String and Boolean are inline", () =>
    Effect.gen(function*() {
      const { ops, shared } = yield* generate()
      assert.strictEqual(member(ops, "id"), "Shared.ID")
      assert.strictEqual(member(ops, "subtaskCount"), "Shared.Int")
      assert.strictEqual(member(ops, "done"), "Schema.Boolean")
      assert.strictEqual(member(ops, "heading"), "Schema.String")
      const sharedLines = fileLines(shared)
      assert.include(sharedLines, "export const Int = Schema.Number.check(Schema.isInt32())")
      assert.include(sharedLines, "export const Float = Schema.Finite")
      assert.include(sharedLines, "export const ID = Schema.String")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("5. the scalar mapping overrides a built-in", () =>
    Effect.gen(function*() {
      const { shared } = yield* generate({
        ...taskConfig,
        scalars: { ...taskConfig.scalars, ID: "./scalars.ts#NodeId" }
      })
      assert.match(declaration(shared, "ID"), /^export const ID = \w+\.NodeId$/)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("6. a mapped custom scalar is re-exported from its module and used in results and inputs", () =>
    Effect.gen(function*() {
      const { ops, shared } = yield* generate()
      assert.strictEqual(member(ops, "due"), "Schema.NullOr(Shared.Timestamp)")
      assert.match(shared, /^import \* as \w+ from "\.\.\/scalars\.ts"$/m)
      assert.match(declaration(shared, "Timestamp"), /^export const Timestamp = \w+\.Timestamp$/)
      assert.deepStrictEqual(declarationDoc(shared, "Timestamp"), ["A point in time, sent as an ISO-8601 string."])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("7. unmapped custom scalars are Schema.Json", () =>
    Effect.gen(function*() {
      const { ops, shared } = yield* generate()
      assert.strictEqual(member(ops, "bodyHTML"), "Shared.HTML")
      assert.include(fileLines(shared), "export const HTML = Schema.Json")
      assert.include(fileLines(shared), "export const Markdown = Schema.Json")
      assert.strictEqual(member(shared, "notesContain"), "Schema.optional(Schema.NullOr(Markdown))")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("8. enums are Schema.Literals with per-value docs in the enum's JSDoc", () =>
    Effect.gen(function*() {
      const { shared } = yield* generate()
      assert.strictEqual(
        declaration(shared, "Priority"),
        `export const Priority = Schema.Literals(["HIGH", "LOW", "MEDIUM"])`
      )
      const doc = declarationDoc(shared, "Priority")
      assert.include(doc, "How urgent a task is.")
      assert.include(doc, "- `HIGH`: Do it now.")
      assert.include(doc, "- `LOW`: Whenever there is time.")
      const medium = doc.find((line) => line.startsWith("- `MEDIUM`: Somewhere in between."))
      assert(medium !== undefined, `expected a MEDIUM entry in ${JSON.stringify(doc)}`)
      assert.match(medium, /deprecated/i)
      assert.include(medium, "Use LOW instead.")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("9. enums decode leniently in results and stay strict in inputs", () =>
    Effect.gen(function*() {
      const { ops, shared } = yield* generate()
      const priority = member(ops, "priority")
      assert.include(priority, "GraphQL.enumLiterals(")
      assert.include(priority, "Priority")
      const override = member(ops, "override")
      assert.isTrue(override.startsWith("Schema.NullOr(GraphQL.enumLiterals("), override)
      assert.strictEqual(member(shared, "priority"), "Schema.optional(Schema.NullOr(Priority))")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("10. an alias keys the aliased field and takes its docs; an explicit __typename is a Literal", () =>
    Effect.gen(function*() {
      const { ops } = yield* generate()
      assert.strictEqual(member(ops, "heading"), "Schema.String")
      assert.deepStrictEqual(docOf(ops, "heading"), ["The task's title."])
      assert.sameMembers([...members(ops, "__typename")], [`Schema.Literal("Query")`, `Schema.Literal("Task")`])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("descriptions and @deprecated reasons become JSDoc on result fields", () =>
    Effect.gen(function*() {
      const { ops } = yield* generate()
      assert.deepStrictEqual(docOf(ops, "estimate"), ["Estimated hours of work."])
      assert.deepStrictEqual(docOf(ops, "tasks"), ["Tasks matching a filter."])
      const labels = docOf(ops, "labels")
      assert.include(labels, "Free-form labels.")
      assert.include(labels, "@deprecated Use `tags`.")
    }).pipe(Effect.provide(NodeServices.layer)))
})

describe("Generator shared module", () => {
  it.effect("input objects are Schema.Opaque classes declared after their dependencies", () =>
    Effect.gen(function*() {
      const { shared } = yield* generate()
      assert.match(
        declaration(shared, "TaskFilter"),
        /^export class TaskFilter extends Schema\.Opaque<TaskFilter>\(\)\(/
      )
      assert.match(declaration(shared, "TagMatch"), /^export class TagMatch extends Schema\.Opaque<TagMatch>\(\)\(/)
      assert.deepStrictEqual(declarationDoc(shared, "TaskFilter"), ["Filters tasks."])
      assertDeclaredInOrder(shared, ["Priority", "TaskFilter"])
      assertDeclaredInOrder(shared, ["Timestamp", "TaskFilter"])
      assertDeclaredInOrder(shared, ["Int", "TaskFilter"])
      assertDeclaredInOrder(shared, ["TagMatch", "TaskFilter"])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("holds only what the operations reach", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks({ "src/ops.graphql": "query Priorities { tasks { priority } }" })
      assertNoErrors(generated)
      const shared = generated.file("schema/app.graphql.ts")
      assert.isTrue(declares(shared, "Priority"))
      for (const name of ["Int", "Float", "ID", "Timestamp", "HTML", "Markdown", "Blob", "TaskFilter", "TagMatch"]) {
        assert.isFalse(declares(shared, name), `${name} is not reached`)
      }
    }).pipe(Effect.provide(NodeServices.layer)))
})

describe("Generator scalar specifiers and output locations", () => {
  it.effect("the shared module defaults to the schema's name and directory", () =>
    Effect.gen(function*() {
      const { generated, ops } = yield* generate()
      assert.deepStrictEqual(generated.paths, ["schema/app.graphql.ts", "src/ops.graphql.ts"])
      assert.match(ops, /^import \* as Shared from "\.\.\/schema\/app\.graphql\.ts"$/m)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("shared moves the shared module and relative scalar specifiers follow it", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks(
        { "src/ops.graphql": operations },
        { ...taskConfig, shared: "./src/shared.graphql.ts" }
      )
      assertNoErrors(generated)
      assert.deepStrictEqual(generated.paths, ["src/ops.graphql.ts", "src/shared.graphql.ts"])
      assert.match(generated.file("src/ops.graphql.ts"), /^import \* as Shared from "\.\/shared\.graphql\.ts"$/m)
      assert.match(generated.file("src/shared.graphql.ts"), /^import \* as \w+ from "\.\.\/scalars\.ts"$/m)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("importExtension applies to imports between generated files and to relative scalar modules", () =>
    Effect.gen(function*() {
      const js = yield* generate({ ...taskConfig, importExtension: ".js" })
      assert.match(js.ops, /^import \* as Shared from "\.\.\/schema\/app\.graphql\.js"$/m)
      assert.match(js.shared, /^import \* as \w+ from "\.\.\/scalars\.js"$/m)
      const none = yield* generate({ ...taskConfig, importExtension: "" })
      assert.match(none.ops, /^import \* as Shared from "\.\.\/schema\/app\.graphql"$/m)
      assert.match(none.shared, /^import \* as \w+ from "\.\.\/scalars"$/m)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("bare scalar specifiers pass through unchanged", () =>
    Effect.gen(function*() {
      const { shared } = yield* generate({
        ...taskConfig,
        importExtension: ".js",
        scalars: { Timestamp: "@acme/scalars#Timestamp" }
      })
      assert.match(shared, /^import \* as \w+ from "@acme\/scalars"$/m)
      assert.match(declaration(shared, "Timestamp"), /^export const Timestamp = \w+\.Timestamp$/)
    }).pipe(Effect.provide(NodeServices.layer)))
})
