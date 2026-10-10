import * as Validate from "@effect/graphql-generator/internal/Validate"
import { assert, describe, it } from "@effect/vitest"
import { parseOrThrow, source } from "./utils/ast.ts"
import { readSdl } from "./utils/model.ts"

const schema = readSdl(`
interface Node { id: ID! }
interface Orphan { id: ID! }
type User implements Node { id: ID! name: String! friends(first: Int!): [User!]! }
type Dog implements Node { id: ID! }
type Query { user(id: ID!): User orphan: Orphan }
`)

const validate = (files: Record<string, string>): ReadonlyArray<string> =>
  Validate.validate(
    schema,
    Object.entries(files).map(([path, body]) => ({ source: source(body, path), document: parseOrThrow(body, path) }))
  ).map(({ column, line, message, path }) => `${path}:${line}:${column} ${message}`)

describe("Validate", () => {
  it("fields exist on their parent type", () => {
    assert.deepStrictEqual(validate({ "q.graphql": "query Q { user(id: \"1\") { homepage } }" }), [
      "q.graphql:1:27 Cannot query field \"homepage\" on type \"User\"."
    ])
  })

  it("arguments exist and required arguments are provided", () => {
    assert.deepStrictEqual(
      validate({ "q.graphql": "query Q { user(id: \"1\", locale: \"en\") { friends { id } } }" }),
      [
        "q.graphql:1:25 Unknown argument \"locale\" on field \"Query.user\".",
        "q.graphql:1:41 Field \"friends\" argument \"first\" of type \"Int!\" is required, but it was not provided."
      ]
    )
  })

  it("variables are defined, used and of input types", () => {
    assert.deepStrictEqual(
      validate({ "q.graphql": "query Q($unused: ID, $u: User) { user(id: $u) { friends(first: $n) { id } } }" }),
      [
        "q.graphql:1:9 Variable \"$unused\" is never used in operation \"Q\".",
        "q.graphql:1:26 Variable \"$u\" cannot be non-input type \"User\".",
        "q.graphql:1:64 Variable \"$n\" is not defined by operation \"Q\"."
      ]
    )
  })

  it("fragments are defined and used", () => {
    assert.deepStrictEqual(
      validate({ "q.graphql": "query Q { user(id: \"1\") { ...Missing } } fragment Unused on User { id }" }),
      [
        "q.graphql:1:30 Unknown fragment \"Missing\".",
        "q.graphql:1:42 Fragment \"Unused\" is never used."
      ]
    )
  })

  it("fragments are spread onto a possible type", () => {
    assert.deepStrictEqual(validate({ "q.graphql": "query Q { user(id: \"1\") { ... on Dog { id } } }" }), [
      "q.graphql:1:27 Fragment cannot be spread here as objects of type \"User\" can never be of type \"Dog\"."
    ])
  })

  it("a composite type overlaps itself, even with no possible types", () => {
    assert.deepStrictEqual(
      validate({
        "q.graphql": "query Q { orphan { ... on Orphan { id } ...OrphanId } } fragment OrphanId on Orphan { id }"
      }),
      []
    )
  })

  it("operations are named and operation names are unique", () => {
    assert.deepStrictEqual(
      validate({ "q.graphql": "{ orphan { id } } query Q { orphan { id } } query Q { orphan { id } }" }),
      [
        "q.graphql:1:1 Anonymous operations are not supported, name this operation.",
        "q.graphql:1:25 There can be only one operation named \"Q\".",
        "q.graphql:1:51 There can be only one operation named \"Q\"."
      ]
    )
  })

  it("operations and fragments share one name namespace across files", () => {
    assert.deepStrictEqual(
      validate({
        "a.graphql": "query A { user(id: \"1\") { ...Friends } } fragment Friends on User { id }",
        "b.graphql": "query Friends { orphan { id } }"
      }),
      [
        "a.graphql:1:51 There can be only one operation or fragment named \"Friends\".",
        "b.graphql:1:7 There can be only one operation or fragment named \"Friends\"."
      ]
    )
  })

  it("leaf fields have no selection set and composite fields have one", () => {
    assert.deepStrictEqual(
      validate({ "q.graphql": "query Q { user(id: \"1\") { id { name } friends(first: 1) } }" }),
      [
        "q.graphql:1:30 Field \"id\" must not have a selection since type \"ID!\" has no subfields.",
        "q.graphql:1:39 Field \"friends\" of type \"[User!]!\" must have a selection of subfields. Did you mean \"friends { ... }\"?"
      ]
    )
  })

  it("fields sharing a response key are the same field with the same arguments", () => {
    assert.deepStrictEqual(
      validate({
        "q.graphql": "query Q { user(id: \"1\") { name: id name friends(first: 1) { id } friends(first: 2) { id } } }"
      }),
      [
        "q.graphql:1:36 Fields \"name\" conflict because \"id\" and \"name\" are different fields. Use different aliases on the fields to fetch both if this was intentional.",
        "q.graphql:1:66 Fields \"friends\" conflict because they have differing arguments. Use different aliases on the fields to fetch both if this was intentional."
      ]
    )
  })

  it("fragments and the variables they use resolve across files", () => {
    assert.deepStrictEqual(
      validate({
        "viewer.graphql": "query Viewer($id: ID!) { ...ViewerUser }",
        "fragments.graphql": "fragment ViewerUser on Query { user(id: $id) { name } }"
      }),
      []
    )
  })

  it("a diagnostic is reported in the file holding the offending node", () => {
    assert.deepStrictEqual(
      validate({
        "viewer.graphql": "query Viewer { user(id: \"1\") { ...A } ...ViewerUser } fragment B on User { ...A }",
        "fragments.graphql": "fragment ViewerUser on Query { user(id: $id) { id } } fragment A on User { ...B }"
      }),
      [
        "viewer.graphql:1:76 Cannot spread fragment \"B\" within itself via \"A\".",
        "fragments.graphql:1:41 Variable \"$id\" is not defined by operation \"Viewer\"."
      ]
    )
  })
})
