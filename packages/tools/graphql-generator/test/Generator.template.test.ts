/**
 * Operation documents emitted as templates (EFF-2002). Joining the template
 * must give exactly the document the printer produced before templates, and
 * rendering it for several slices must give a document the schema accepts.
 */
import type * as Ast from "@effect/graphql-generator/internal/Ast"
import * as Validate from "@effect/graphql-generator/internal/Validate"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import type { GraphQL } from "effect/graphql"
import { renderSlices } from "effect/internal/graphql"
import { parseOrThrow, source } from "./utils/ast.ts"
import { assertNoErrors, generateTasks, importGenerated, taskSchemaSdl } from "./utils/generator.ts"
import { readSdl } from "./utils/model.ts"

// `TaskCore` references no variable, so a batch shares it. `TaskDue`
// references `$withDue`, so each slice gets its own copy.
const board = `
query Board($first: Int! = 5, $taskId: ID!, $withDue: Boolean! = false, $withTasks: Boolean!) {
  tasks(first: $first) @include(if: $withTasks) {
    ...TaskCore
    ...TaskDue
  }
  current: task(id: $taskId) {
    ...TaskDue
  }
}

fragment TaskCore on Task {
  id
  title
}

fragment TaskDue on Task {
  estimate @include(if: $withDue)
  ...TaskCore
}
`

const importBoard = Effect.gen(function*() {
  const generated = yield* generateTasks({ "src/board.graphql": board })
  assertNoErrors(generated)
  const module = yield* importGenerated(generated, "src/board.graphql.ts")
  return module.Board as GraphQL.Any
}).pipe(Effect.provide(NodeServices.layer))

describe("Generator document templates", () => {
  it.effect("joining the template gives the printed document", () =>
    Effect.gen(function*() {
      const Board = yield* importBoard
      assert.isDefined(Board.template)
      assert.strictEqual(
        Board.document,
        "query Board($first:Int!=5$taskId:ID!$withDue:Boolean!=false$withTasks:Boolean!){tasks(first:$first)@include(if:$withTasks){...TaskCore...TaskDue}current:task(id:$taskId){...TaskDue}}fragment TaskCore on Task{id title}fragment TaskDue on Task{estimate@include(if:$withDue)...TaskCore}"
      )
    }))

  it.effect("two slices render a valid document with renamed variables and per-slice fragments", () =>
    Effect.gen(function*() {
      const Board = yield* importBoard
      assert(Board.template !== undefined)
      const text = renderSlices("query", "Board", Board.template, ["_0_", "_1_"])
      const document = parseOrThrow(text)
      assert.deepStrictEqual(
        Validate.validate(readSdl(taskSchemaSdl), [{ source: source(text), document }]).map(({ message }) => message),
        []
      )

      const [operation, ...fragments] = document.definitions
      assert(operation?._tag === "OperationDefinition")
      assert.deepStrictEqual(operation.variableDefinitions.map((v) => v.variable.name.value), [
        "_0_first",
        "_0_taskId",
        "_0_withDue",
        "_0_withTasks",
        "_1_first",
        "_1_taskId",
        "_1_withDue",
        "_1_withTasks"
      ])
      assert.deepStrictEqual(
        operation.selectionSet.selections.map((s) => s._tag === "Field" ? s.alias?.value : s._tag),
        ["_0_tasks", "_0_current", "_1_tasks", "_1_current"]
      )
      assert.deepStrictEqual(
        fragments.map((f) => (f as Ast.FragmentDefinition).name.value),
        ["TaskCore", "_0_TaskDue", "_1_TaskDue"]
      )
    }))
})
