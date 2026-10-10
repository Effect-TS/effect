import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { GraphQL, GraphQLMiddleware } from "effect/graphql"

class Auth extends GraphQLMiddleware.Service<Auth>()("Auth") {}

describe("GraphQL", () => {
  it("middleware returns a new operation and leaves the original unchanged", () => {
    const Viewer = GraphQL.query("Viewer", { document: "query Viewer{viewer{login}}", result: Schema.Struct({}) })
    const authed = Viewer.middleware(Auth)
    assert.deepStrictEqual(authed.middlewares, [Auth])
    assert.deepStrictEqual(Viewer.middlewares, [])
  })

  it.effect("otherTypename accepts any type name except the selected ones", () =>
    Effect.gen(function*() {
      const decode = Schema.decodeUnknownEffect(GraphQL.otherTypename<"Issue" | "PullRequest">()(["Issue"]))
      assert.strictEqual(yield* decode("PullRequest"), "PullRequest")
      assert.strictEqual(yield* decode("AddedLater"), "AddedLater")
      assert.instanceOf(yield* Effect.flip(decode("Issue")), Schema.SchemaError)
    }))

  it.effect("enumLiterals accepts a value the server added later", () =>
    Effect.gen(function*() {
      const decode = Schema.decodeUnknownEffect(GraphQL.enumLiterals(["OPEN", "CLOSED"]))
      assert.strictEqual(yield* decode("MERGED"), "MERGED")
    }))
})
