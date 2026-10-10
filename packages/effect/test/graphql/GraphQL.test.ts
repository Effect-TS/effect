import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { GraphQL } from "effect/graphql"

type NodeTypename = "Issue" | "PullRequest" | "Repository"

describe("GraphQL", () => {
  describe("operations", () => {
    it("carry kind, name, document and schemas", () => {
      const op = GraphQL.query("Viewer", {
        document: "query Viewer{viewer{login}}",
        result: Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
      })
      assert.strictEqual(op.kind, "query")
      assert.strictEqual(op.name, "Viewer")
      assert.strictEqual(op.document, "query Viewer{viewer{login}}")
      assert.strictEqual(GraphQL.mutation("M", { document: "", result: Schema.Null }).kind, "mutation")
      assert.strictEqual(GraphQL.subscription("S", { document: "", result: Schema.Null }).kind, "subscription")
    })
  })

  describe("otherTypename", () => {
    const Other = GraphQL.otherTypename<NodeTypename>()(["Issue"])
    const decode = Schema.decodeUnknownEffect(Other)

    it.effect("decodes an unselected known type name", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* decode("PullRequest"), "PullRequest")
      }))

    it.effect("decodes a type name the schema does not know yet", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* decode("AddedLater"), "AddedLater")
      }))

    it.effect("rejects a selected type name so a malformed selected object cannot fall through", () =>
      Effect.gen(function*() {
        const issue = yield* Effect.flip(decode("Issue"))
        assert.instanceOf(issue, Schema.SchemaError)
      }))

    it.effect("rejects non-strings", () =>
      Effect.gen(function*() {
        assert.instanceOf(yield* Effect.flip(decode(42)), Schema.SchemaError)
      }))

    it.effect("rejects every selected name when several are selected", () =>
      Effect.gen(function*() {
        const two = Schema.decodeUnknownEffect(GraphQL.otherTypename<NodeTypename>()(["Issue", "PullRequest"]))
        assert.strictEqual(yield* two("Repository"), "Repository")
        assert.instanceOf(yield* Effect.flip(two("PullRequest")), Schema.SchemaError)
      }))
  })

  describe("enumLiterals", () => {
    const IssueState = GraphQL.enumLiterals(["OPEN", "CLOSED"])
    const decode = Schema.decodeUnknownEffect(IssueState)

    it.effect("decodes a declared value", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* decode("OPEN"), "OPEN")
      }))

    it.effect("decodes a value the server added later", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* decode("MERGED"), "MERGED")
      }))

    it.effect("rejects non-strings", () =>
      Effect.gen(function*() {
        assert.instanceOf(yield* Effect.flip(decode(1)), Schema.SchemaError)
        assert.instanceOf(yield* Effect.flip(decode(null)), Schema.SchemaError)
      }))
  })
})
