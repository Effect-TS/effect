import { assert, describe, it } from "@effect/vitest"
import { DateTime, Effect, Stream } from "effect"
import { GraphQLClient } from "effect/graphql"
import { IssuesGroup } from "./fixtures.ts"

const issue = (number: number) => ({
  number,
  title: `#${number}`,
  createdAt: DateTime.makeUnsafe("2026-01-01T00:00:00Z")
})

const page = (
  nodes: ReadonlyArray<ReturnType<typeof issue>>,
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
) => ({ repository: { issues: { pageInfo, nodes } } })

const variables = { owner: "Effect-TS", name: "effect" }

describe("GraphQLClient.makeTest", () => {
  it.effect("a handled query returns the handler's value and receives the caller's variables", () =>
    Effect.gen(function*() {
      const result = page([issue(1)], { hasNextPage: false, endCursor: null })
      const received: Array<unknown> = []
      const client = GraphQLClient.makeTest(IssuesGroup)({
        RepoIssues: (variables) => {
          received.push(variables)
          return Effect.succeed(result)
        }
      })
      const since = DateTime.makeUnsafe("2026-01-01T00:00:00Z")
      const called = { ...variables, since }

      assert.strictEqual(yield* client.RepoIssues(called), result)
      assert.strictEqual(received[0], called)
    }))

  it.effect("partial: true returns the handler's value as data with no errors", () =>
    Effect.gen(function*() {
      const result = page([issue(1)], { hasNextPage: false, endCursor: null })
      const client = GraphQLClient.makeTest(IssuesGroup)({
        RepoIssues: () => Effect.succeed(result)
      })

      const partial = yield* client.RepoIssues(variables, { partial: true })
      assert.strictEqual(partial.data, result)
      assert.deepStrictEqual(partial.errors, [])
    }))

  it.effect("an operation without a handler dies with an UnimplementedError", () =>
    Effect.gen(function*() {
      const client = GraphQLClient.makeTest(IssuesGroup)({})

      const defect = yield* client.RepoIssues(variables).pipe(Effect.catchDefect(Effect.fail), Effect.flip)
      assert.instanceOf(defect, Error)
      assert.strictEqual(defect.name, "UnimplementedError")
      assert.strictEqual(defect.message, `GraphQLClient: Unimplemented operation "RepoIssues"`)
    }))

  it.effect("GraphQLClient.pages drives a mock method across two pages", () =>
    Effect.gen(function*() {
      const cursors: Array<string | null | undefined> = []
      const client = GraphQLClient.makeTest(IssuesGroup)({
        RepoIssues: ({ after }) => {
          cursors.push(after)
          return Effect.succeed(
            after === "c1"
              ? page([issue(2)], { hasNextPage: false, endCursor: null })
              : page([issue(1)], { hasNextPage: true, endCursor: "c1" })
          )
        }
      })

      const pages = yield* Stream.runCollect(
        GraphQLClient.pages(client.RepoIssues, { variables, connection: (r) => r.repository?.issues })
      )
      assert.deepStrictEqual(pages.map((p) => p.nodes?.map((i) => i?.number)), [[1], [2]])
      assert.deepStrictEqual(cursors, [undefined, "c1"])
    }))
})
