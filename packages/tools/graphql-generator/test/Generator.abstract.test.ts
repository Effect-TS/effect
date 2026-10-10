/**
 * Unions, interfaces, `@oneOf` input objects and subscriptions (EFF-1831
 * point 4, EFF-1832 points 10 and 12, EFF-1830 point 1), asserted on the
 * emitted text and by importing the generated modules and decoding or
 * encoding through them.
 */
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
  assertNoErrors,
  declaration,
  documentOf,
  fileLines,
  generateIn,
  importGenerated,
  member,
  typenames
} from "./utils/generator.ts"
import { fixture } from "./utils/model.ts"

/**
 * `Node` has three implementers and `SearchResult` three members, listed out
 * of alphabetical order. `Named` is a second interface over two of them.
 */
const schema = `
interface Node { id: ID! }
interface Named { name: String! }
type User implements Node & Named { id: ID! name: String! email: String }
type Bot implements Node & Named { id: ID! name: String! owner: User }
type Team implements Node { id: ID! size: Int! }
union SearchResult = User | Team | Bot
type Query {
  node(id: ID!): Node
  search(term: String!): [SearchResult!]!
  user: User
}
type Subscription { userChanged: User! }
`

const config = { schema: "./schema.graphql", documents: ["src/*.graphql"] }

const generate = (documents: Readonly<Record<string, string>>) =>
  generateIn({ "schema.graphql": schema, ...documents }, config).pipe(
    Effect.map((generated) => {
      assertNoErrors(generated)
      return generated
    })
  )

describe("Generator unions and interfaces", () => {
  it.effect("__typename is added first to a selection on an interface, in the document and the Schema", () =>
    Effect.gen(function*() {
      const generated = yield* generate({
        "src/ops.graphql": "query Find($id: ID!) { node(id: $id) { id ... on User { name } } }"
      })
      const ops = generated.file("src/ops.graphql.ts")
      assert.strictEqual(
        documentOf(ops, "Find"),
        "query Find($id:ID!){node(id:$id){__typename id...on User{name}}}"
      )
      assert.include(ops, `__typename: Schema.Literal("User")`)
      assert.include(ops, `GraphQL.otherTypename<Shared.Typename.Node>()(["User"])`)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("an interface selection decodes selected types, other known types and types added later", () =>
    Effect.gen(function*() {
      const generated = yield* generate({
        "src/ops.graphql": "query Find($id: ID!) { node(id: $id) { id ... on User { name } } }"
      })
      const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
      const decode = Schema.decodeUnknownSync(ops.Find.result)
      const user = { node: { __typename: "User", id: "1", name: "Ann" } }
      assert.deepStrictEqual(decode(user), user)
      const team = { node: { __typename: "Team", id: "2" } }
      assert.deepStrictEqual(decode(team), team)
      const later = { node: { __typename: "Robot", id: "3" } }
      assert.deepStrictEqual(decode(later), later)
      assert.deepStrictEqual(decode({ node: null }), { node: null })
      // A selected type that fails its own member must not fall into the other bucket.
      assert.throws(() => decode({ node: { __typename: "User", id: "1" } }))
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a selection on an interface with no inline fragments still decodes __typename", () =>
    Effect.gen(function*() {
      const generated = yield* generate({ "src/ops.graphql": "query Find($id: ID!) { node(id: $id) { id } }" })
      const text = generated.file("src/ops.graphql.ts")
      assert.strictEqual(documentOf(text, "Find"), "query Find($id:ID!){node(id:$id){__typename id}}")
      const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
      const team = { node: { __typename: "Team", id: "2" } }
      assert.deepStrictEqual(Schema.decodeUnknownSync(ops.Find.result)(team), team)
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a union selection is one Literal struct per inline fragment plus the other types", () =>
    Effect.gen(function*() {
      const generated = yield* generate({
        "src/ops.graphql": `query Search { search(term: "a") { ... on User { name } ... on Bot { name } } }`
      })
      const text = generated.file("src/ops.graphql.ts")
      assert.strictEqual(
        documentOf(text, "Search"),
        `query Search{search(term:"a"){__typename...on User{name}...on Bot{name}}}`
      )
      assert.include(text, `__typename: Schema.Literal("User")`)
      assert.include(text, `__typename: Schema.Literal("Bot")`)
      assert.include(text, `GraphQL.otherTypename<Shared.Typename.SearchResult>()(["User", "Bot"])`)

      const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
      const decode = Schema.decodeUnknownSync(ops.Search.result)
      const results = {
        search: [
          { __typename: "User", name: "Ann" },
          { __typename: "Bot", name: "ci" },
          { __typename: "Team" }
        ]
      }
      assert.deepStrictEqual(decode(results), results)
      assert.throws(() => decode({ search: [{ __typename: "Bot" }] }))
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("an explicit __typename on an abstract selection is printed once", () =>
    Effect.gen(function*() {
      const generated = yield* generate({
        "src/ops.graphql": `query Search { search(term: "a") { __typename ... on Team { size } } }`
      })
      assert.strictEqual(
        documentOf(generated.file("src/ops.graphql.ts"), "Search"),
        `query Search{search(term:"a"){__typename...on Team{size}}}`
      )
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("an inline fragment on an interface applies to every implementer the parent can be", () =>
    Effect.gen(function*() {
      const generated = yield* generate({
        "src/ops.graphql": `query Search { search(term: "a") { ... on Named { name } ... on Team { size } } }`
      })
      const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
      const decode = Schema.decodeUnknownSync(ops.Search.result)
      const results = {
        search: [
          { __typename: "User", name: "Ann" },
          { __typename: "Bot", name: "ci" },
          { __typename: "Team", size: 3 }
        ]
      }
      assert.deepStrictEqual(decode(results), results)
      assert.throws(() => decode({ search: [{ __typename: "Bot" }] }))
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("the shared module lists each abstract type's possible types once in its Typename namespace", () =>
    Effect.gen(function*() {
      const generated = yield* generate({
        "src/a.graphql": "query A($id: ID!) { node(id: $id) { id } }",
        "src/b.graphql": `query B($id: ID!) { node(id: $id) { id } search(term: "b") { ... on Team { size } } }`
      })
      const shared = generated.file("schema.graphql.ts")
      assert.strictEqual(fileLines(shared).filter((line) => line === "export declare namespace Typename {").length, 1)
      assert.sameMembers([...typenames(shared, "Node")], ["Bot", "Team", "User"])
      assert.sameMembers([...typenames(shared, "SearchResult")], ["Bot", "Team", "User"])
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("a fragment on an interface is a Schema.Union type alias, not an Opaque class", () =>
    Effect.gen(function*() {
      const generated = yield* generate({
        "src/fragments.graphql": "fragment NodeBits on Node { id ... on User { name } }",
        "src/ops.graphql": "query Find($id: ID!) { node(id: $id) { ...NodeBits } }"
      })
      const fragments = generated.file("src/fragments.graphql.ts")
      assert.match(declaration(fragments, "NodeBits"), /^export const NodeBits = Schema\.Union\(\[/)
      assert.include(fileLines(fragments), "export type NodeBits = typeof NodeBits.Type")
      assert.include(fragments, `GraphQL.otherTypename<Shared.Typename.Node>()(["User"])`)
      assert.isTrue(
        documentOf(generated.file("src/ops.graphql.ts"), "Find").endsWith(
          "fragment NodeBits on Node{__typename id...on User{name}}"
        )
      )
      const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
      const user = { node: { __typename: "User", id: "1", name: "Ann" } }
      assert.deepStrictEqual(Schema.decodeUnknownSync(ops.Find.result)(user), user)
    }).pipe(Effect.provide(NodeServices.layer)))
})

describe("Generator @oneOf input objects", () => {
  const generateOneOf = generateIn({
    "schema.graphql": fixture("sdl/one-of.graphql"),
    "src/ops.graphql": "query Pet($by: PetBy!) { pet(by: $by) }"
  }, config).pipe(Effect.map((generated) => {
    assertNoErrors(generated)
    return generated
  }))

  // Not pinned to `export class`: a class can't extend `Opaque` over a union (TS2509).
  it.effect("are a Schema.Union wrapped in Schema.Opaque", () =>
    Effect.gen(function*() {
      const generated = yield* generateOneOf
      assert.match(
        declaration(generated.file("schema.graphql.ts"), "PetBy"),
        /Schema\.Opaque<PetBy>\(\)\(Schema\.Union\(\[/
      )
      assert.strictEqual(member(generated.file("src/ops.graphql.ts"), "by"), "Shared.PetBy")
    }).pipe(Effect.provide(NodeServices.layer)))

  it.effect("encode exactly one non-null key and reject anything else", () =>
    Effect.gen(function*() {
      const generated = yield* generateOneOf
      const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
      const encode = Schema.encodeUnknownSync(ops.Pet.variables)
      assert.deepStrictEqual(encode({ by: { id: "1" } }), { by: { id: "1" } })
      assert.deepStrictEqual(encode({ by: { name: "Rex" } }), { by: { name: "Rex" } })
      assert.throws(() => encode({ by: { id: "1", name: "Rex" } }))
      assert.throws(() => encode({ by: {} }))
      assert.throws(() => encode({ by: { id: null } }))
    }).pipe(Effect.provide(NodeServices.layer)))
})

describe("Generator subscriptions", () => {
  it.effect("emit GraphQL.subscription and join the file's group", () =>
    Effect.gen(function*() {
      const generated = yield* generate({
        "src/ops.graphql": "query Me { user { id } }\n\nsubscription Changed { userChanged { id name } }"
      })
      const text = generated.file("src/ops.graphql.ts")
      const lines = fileLines(text)
      assert.include(lines, `export const Changed = GraphQL.subscription("Changed", {`)
      assert.include(lines, "export const OpsGroup = GraphQLGroup.make(Me, Changed)")
      assert.strictEqual(documentOf(text, "Changed"), "subscription Changed{userChanged{id name}}")
      const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
      assert.strictEqual(ops.Changed.kind, "subscription")
      const event = { userChanged: { id: "1", name: "Ann" } }
      assert.deepStrictEqual(Schema.decodeUnknownSync(ops.Changed.result)(event), event)
    }).pipe(Effect.provide(NodeServices.layer)))
})

describe("Generator abstract-type review regressions", () => {
  const generateWith = (schemaSdl: string, document: string) =>
    generateIn({ "schema.graphql": schemaSdl, "src/ops.graphql": document }, config).pipe(
      Effect.map((generated) => {
        assertNoErrors(generated)
        return generated
      })
    )

  for (
    const { kind, schemaSdl } of [
      {
        kind: "an interface",
        schemaSdl: "interface Only { id: ID! }\ntype User implements Only { id: ID! name: String! }"
      },
      { kind: "a union", schemaSdl: "union Only = User\ntype User { id: ID! name: String! }" }
    ]
  ) {
    it.effect(`a fragment on the only possible type of ${kind} keeps its own member`, () =>
      Effect.gen(function*() {
        const generated = yield* generateWith(
          `${schemaSdl}\ntype Query { only: Only }`,
          "query Q { only { ... on User { name } } }"
        )
        const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
        const decode = Schema.decodeUnknownSync(ops.Q.result)
        const user = { only: { __typename: "User", name: "Ann" } }
        assert.deepStrictEqual(decode(user), user)
        assert.throws(() => decode({ only: { __typename: "User" } }))
      }).pipe(Effect.provide(NodeServices.layer)))
  }

  for (
    const { kind, parent } of [
      { kind: "a union", parent: "union Result = User | Bot" },
      { kind: "an interface without the field", parent: "interface Result { id: ID! }" }
    ]
  ) {
    it.effect(`an interface fragment covering every possible type of ${kind} generates and decodes`, () =>
      Effect.gen(function*() {
        const implementsResult = parent.startsWith("interface") ? " & Result" : ""
        const generated = yield* generateWith(
          `interface Named { name: String! }
${parent}
type User implements Named${implementsResult} { id: ID! name: String! }
type Bot implements Named${implementsResult} { id: ID! name: String! }
type Query { results: [Result!]! }`,
          "query Q { results { ... on Named { name } } }"
        )
        const ops = yield* importGenerated(generated, "src/ops.graphql.ts")
        const decode = Schema.decodeUnknownSync(ops.Q.result)
        const results = { results: [{ __typename: "User", name: "Ann" }, { __typename: "Bot", name: "ci" }] }
        assert.deepStrictEqual(decode(results), results)
        assert.throws(() => decode({ results: [{ __typename: "Bot" }] }))
      }).pipe(Effect.provide(NodeServices.layer)))
  }
})
