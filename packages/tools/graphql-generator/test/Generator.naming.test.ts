/**
 * Names of the classes extracted from nested result selections (EFF-1995
 * points 3 to 6): the `<Operation><Type>` base name, one class for identical
 * selections, the field-key fallback when shapes clash, and the diagnostic
 * when a generated name collides with a definition. The subscriptions
 * snapshot set covers union members and the catch-all.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { assertNoErrors, declaration, fileLines, generateIn, member, members } from "./utils/generator.ts"

const schema = `
type User { id: ID! login: String! }
type Issue { id: ID! title: String! author: User assignee: User }
type Query { issues: [Issue!]! pulls: [Issue!]! }
`

const generate = (documents: Readonly<Record<string, string>>) =>
  generateIn({ "schema.graphql": schema, ...documents }, { schema: "./schema.graphql", documents: ["src/*.graphql"] })

const generateBoard = (document: string) =>
  generate({ "src/board.graphql": document }).pipe(
    Effect.map((generated) => {
      assertNoErrors(generated)
      return generated.file("src/board.graphql.ts")
    })
  )

const classNames = (text: string): ReadonlyArray<string> =>
  fileLines(text).flatMap((line) => {
    const match = /^export class (\w+) /.exec(line)
    return match === null ? [] : [match[1]!]
  }).sort()

describe("Generator nested selection names", () => {
  it.effect("a nested selection is a class named <Operation><Type>, or <Fragment><Type> inside a fragment", () =>
    Effect.gen(function*() {
      const board = yield* generateBoard(`
query Board {
  issues { id author { login } }
  pulls { ...IssueSummary }
}

fragment IssueSummary on Issue { title assignee { login } }
`)
      assert.deepStrictEqual(classNames(board), ["BoardIssue", "BoardUser", "IssueSummary", "IssueSummaryUser"])
      assert.strictEqual(
        declaration(board, "BoardIssue"),
        "export class BoardIssue extends Schema.Opaque<BoardIssue>()(Schema.Struct({"
      )
      assert.strictEqual(member(board, "issues"), "Schema.Array(BoardIssue)")
      assert.strictEqual(member(board, "author"), "Schema.NullOr(BoardUser)")
      assert.strictEqual(member(board, "pulls"), "Schema.Array(IssueSummary)")
      assert.strictEqual(member(board, "assignee"), "Schema.NullOr(IssueSummaryUser)")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("identical selections of a type share one class", () =>
    Effect.gen(function*() {
      const board = yield* generateBoard("query Board { issues { author { login } assignee { login } } }")
      assert.deepStrictEqual(classNames(board), ["BoardIssue", "BoardUser"])
      assert.strictEqual(member(board, "author"), "Schema.NullOr(BoardUser)")
      assert.strictEqual(member(board, "assignee"), "Schema.NullOr(BoardUser)")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("clashing shapes all fall back to the field key, then to parent response keys until unique", () =>
    Effect.gen(function*() {
      const board = yield* generateBoard("query Board { issues { author { login } } pulls { author { id login } } }")
      assert.deepStrictEqual(classNames(board), [
        "BoardIssuesAuthorUser",
        "BoardIssuesIssue",
        "BoardPullsAuthorUser",
        "BoardPullsIssue"
      ])
      assert.strictEqual(member(board, "issues"), "Schema.Array(BoardIssuesIssue)")
      assert.strictEqual(member(board, "pulls"), "Schema.Array(BoardPullsIssue)")
      assert.deepStrictEqual(members(board, "author").slice().sort(), [
        "Schema.NullOr(BoardIssuesAuthorUser)",
        "Schema.NullOr(BoardPullsAuthorUser)"
      ])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a generated name matching a definition in another file is a located error, not a suffix", () =>
    Effect.gen(function*() {
      const generated = yield* generate({
        "src/a.graphql": "query Board { issues { title } }",
        "src/b.graphql": "query BoardIssue { pulls { id } }"
      })
      const errors = generated.result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")
      assert.deepStrictEqual(
        errors.map(({ column, line, path }) => ({ file: path.split(/[\\/]/).pop(), line, column })),
        [{ file: "a.graphql", line: 1, column: 15 }, { file: "b.graphql", line: 1, column: 7 }]
      )
      for (const error of errors) assert.include(error.message, `"BoardIssue"`)
      assert.deepStrictEqual(generated.result.files, [])
    }).pipe(Effect.provide(NodeServices.layer)))
})
