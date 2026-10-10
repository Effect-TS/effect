/**
 * `@skip` and `@include` (EFF-1832 point 11), asserted on the emitted Schema
 * text and the printed document for `taskSchemaSdl`. A variable condition
 * makes every field it covers an optional key, a literal condition is folded
 * at generation time, and the document keeps every directive as written.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
  assertNoErrors,
  documentOf,
  fileLines,
  generateTasks,
  importGenerated,
  member,
  members
} from "./utils/generator.ts"

// In its own file, so the fields it declares don't repeat in `src/ops.graphql.ts`.
// Only written for operations that spread it, since an unused fragment is an error.
const fragments = `
fragment TaskCore on Task {
  title
  estimate
}
`

const generate = (operations: string) =>
  generateTasks({
    ...(operations.includes("...TaskCore") ? { "src/fragments.graphql": fragments } : {}),
    "src/ops.graphql": operations
  }).pipe(
    Effect.map((generated) => {
      assertNoErrors(generated)
      return { ops: generated.file("src/ops.graphql.ts"), generated }
    })
  )

const spreadsTaskCore = (ops: string): boolean =>
  fileLines(ops).some((line) => line.replace(/,$/, "") === "...TaskCore.fields")

describe("Generator @skip and @include", () => {
  it.effect("a variable condition on a field makes it an optional key", () =>
    Effect.gen(function*() {
      const { generated, ops } = yield* generate(`
query One($show: Boolean!, $taskId: ID!) {
  task(id: $taskId) {
    id
    title @include(if: $show)
    estimate @skip(if: $show)
  }
}
`)
      assert.strictEqual(member(ops, "id"), "Shared.ID")
      assert.strictEqual(member(ops, "title"), "Schema.optionalKey(Schema.String)")
      assert.strictEqual(member(ops, "estimate"), "Schema.optionalKey(Schema.NullOr(Shared.Float))")
      assert.strictEqual(
        documentOf(ops, "One"),
        "query One($show:Boolean!$taskId:ID!){task(id:$taskId){id title@include(if:$show)estimate@skip(if:$show)}}"
      )
      const module = yield* importGenerated(generated, "src/ops.graphql.ts")
      const decode = Schema.decodeUnknownSync(module.One.result)
      assert.deepStrictEqual(decode({ task: { id: "1" } }), { task: { id: "1" } })
      assert.deepStrictEqual(decode({ task: { id: "1", title: "Write tests", estimate: null } }), {
        task: { id: "1", title: "Write tests", estimate: null }
      })
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a variable condition on a spread makes every field it contributes an optional key", () =>
    Effect.gen(function*() {
      const { generated, ops } = yield* generate(`
query One($hide: Boolean!, $taskId: ID!) {
  task(id: $taskId) {
    id
    ...TaskCore @skip(if: $hide)
  }
}
`)
      assert.strictEqual(member(ops, "id"), "Shared.ID")
      assert.strictEqual(member(ops, "title"), "Schema.optionalKey(Schema.String)")
      assert.strictEqual(member(ops, "estimate"), "Schema.optionalKey(Schema.NullOr(Shared.Float))")
      assert.isFalse(spreadsTaskCore(ops), "an optional spread can't reuse the fragment's required fields")
      assert.strictEqual(
        documentOf(ops, "One"),
        "query One($hide:Boolean!$taskId:ID!){task(id:$taskId){id...TaskCore@skip(if:$hide)}}fragment TaskCore on Task{title estimate}"
      )
      const module = yield* importGenerated(generated, "src/ops.graphql.ts")
      assert.deepStrictEqual(Schema.decodeUnknownSync(module.One.result)({ task: { id: "1" } }), { task: { id: "1" } })
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a variable condition on an inline fragment makes every field it contributes an optional key", () =>
    Effect.gen(function*() {
      const { ops } = yield* generate(`
query One($show: Boolean!, $taskId: ID!) {
  task(id: $taskId) {
    id
    ... @include(if: $show) {
      title
      done
    }
  }
}
`)
      assert.strictEqual(member(ops, "id"), "Shared.ID")
      assert.strictEqual(member(ops, "title"), "Schema.optionalKey(Schema.String)")
      assert.strictEqual(member(ops, "done"), "Schema.optionalKey(Schema.Boolean)")
      assert.strictEqual(
        documentOf(ops, "One"),
        "query One($show:Boolean!$taskId:ID!){task(id:$taskId){id...@include(if:$show){title done}}}"
      )
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("literal conditions are folded: the field is dropped or the directive ignored", () =>
    Effect.gen(function*() {
      const { ops } = yield* generate(`
query One($taskId: ID!) {
  task(id: $taskId) {
    id
    title @include(if: false)
    done @skip(if: false)
    estimate @include(if: true)
    due @skip(if: true)
  }
}
`)
      assert.deepStrictEqual(members(ops, "title"), [])
      assert.deepStrictEqual(members(ops, "due"), [])
      assert.strictEqual(member(ops, "done"), "Schema.Boolean")
      assert.strictEqual(member(ops, "estimate"), "Schema.NullOr(Shared.Float)")
      assert.strictEqual(
        documentOf(ops, "One"),
        "query One($taskId:ID!){task(id:$taskId){id title@include(if:false)done@skip(if:false)estimate@include(if:true)due@skip(if:true)}}"
      )
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("literal conditions on spreads are folded: an excluded spread contributes nothing", () =>
    Effect.gen(function*() {
      const { ops } = yield* generate(`
query One($taskId: ID!) {
  task(id: $taskId) {
    id
    ...TaskCore @include(if: false)
  }
}

query Two($taskId: ID!) {
  again: task(id: $taskId) {
    done
    ...TaskCore @skip(if: false)
  }
}
`)
      assert.deepStrictEqual(members(ops, "title"), [])
      assert.deepStrictEqual(members(ops, "estimate"), [])
      assert.isTrue(spreadsTaskCore(ops), "an always-included spread is a plain spread")
      assert.strictEqual(
        documentOf(ops, "One"),
        "query One($taskId:ID!){task(id:$taskId){id...TaskCore@include(if:false)}}fragment TaskCore on Task{title estimate}"
      )
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a partly optional fragment is written out inline", () =>
    Effect.gen(function*() {
      const { generated, ops } = yield* generate(`
query One($show: Boolean!, $taskId: ID!) {
  task(id: $taskId) {
    title
    ...TaskCore @include(if: $show)
  }
}
`)
      assert.strictEqual(member(ops, "title"), "Schema.String")
      assert.strictEqual(member(ops, "estimate"), "Schema.optionalKey(Schema.NullOr(Shared.Float))")
      assert.isFalse(spreadsTaskCore(ops))
      assert.strictEqual(
        documentOf(ops, "One"),
        "query One($show:Boolean!$taskId:ID!){task(id:$taskId){title...TaskCore@include(if:$show)}}fragment TaskCore on Task{title estimate}"
      )
      const module = yield* importGenerated(generated, "src/ops.graphql.ts")
      const decode = Schema.decodeUnknownSync(module.One.result)
      assert.deepStrictEqual(decode({ task: { title: "Write tests" } }), { task: { title: "Write tests" } })
      assert.throws(() => decode({ task: { estimate: 2 } }))
    }).pipe(Effect.provide(NodeServices.layer)))
})

describe("Generator @skip and @include on merged fields", () => {
  const decodeOne = (generated: Parameters<typeof importGenerated>[0]) =>
    Effect.map(
      importGenerated(generated, "src/ops.graphql.ts"),
      (module) => Schema.decodeUnknownSync(module.One.result)
    )

  it.effect("a conditional occurrence of a merged field keeps its condition on the children it adds", () =>
    Effect.gen(function*() {
      const { generated, ops } = yield* generate(`
query One($show: Boolean!, $taskId: ID!) {
  task(id: $taskId) {
    id
  }
  task(id: $taskId) @include(if: $show) {
    title
  }
}
`)
      assert.strictEqual(member(ops, "task"), "Schema.NullOr(Schema.Struct({")
      assert.strictEqual(member(ops, "id"), "Shared.ID")
      assert.strictEqual(member(ops, "title"), "Schema.optionalKey(Schema.String)")
      const decode = yield* decodeOne(generated)
      assert.deepStrictEqual(decode({ task: { id: "1" } }), { task: { id: "1" } })
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a conditional spread adding a second occurrence of a field keeps its condition on the children it adds", () =>
    Effect.gen(function*() {
      const generated = yield* generateTasks({
        "src/fragments.graphql": "fragment TaskTitle on Query {\n  task(id: $taskId) {\n    title\n  }\n}\n",
        "src/ops.graphql": `
query One($show: Boolean!, $taskId: ID!) {
  task(id: $taskId) {
    id
  }
  ...TaskTitle @include(if: $show)
}
`
      })
      assertNoErrors(generated)
      const ops = generated.file("src/ops.graphql.ts")
      assert.strictEqual(member(ops, "id"), "Shared.ID")
      assert.strictEqual(member(ops, "title"), "Schema.optionalKey(Schema.String)")
      const decode = yield* decodeOne(generated)
      assert.deepStrictEqual(decode({ task: { id: "1" } }), { task: { id: "1" } })
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("the children of a field whose only occurrence is conditional stay required", () =>
    Effect.gen(function*() {
      const { ops } = yield* generate(`
query One($show: Boolean!, $taskId: ID!) {
  task(id: $taskId) @include(if: $show) {
    title
  }
}
`)
      assert.strictEqual(member(ops, "task"), "Schema.optionalKey(Schema.NullOr(Schema.Struct({")
      assert.strictEqual(member(ops, "title"), "Schema.String")
    }).pipe(Effect.provide(NodeServices.layer)))
})
