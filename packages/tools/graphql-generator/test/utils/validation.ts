/**
 * Validation cases, one group per EFF-1829 point 5 rule plus cross-file name
 * uniqueness (EFF-1830 point 10). Every group has documents that must pass and
 * documents whose diagnostics are listed in full, in the order `validate`
 * returns them (by file, then by position).
 *
 * Messages are graphql-js's wording for the same rule, without its "Did you
 * mean" suggestion lists, so the reference implementation can arbitrate.
 * Where graphql-js reports several locations, the case uses the one named in
 * the group's `location` note. Rejecting anonymous operations, cross-file
 * fragment resolution and name uniqueness, and the shared operation/fragment
 * namespace (EFF-1831 point 3) have no graphql-js counterpart. graphql-js's full rule set also
 * flags `$viewer` in the variables group for its position, a rule we leave to
 * the runtime.
 */

export const schemaSdl = `
interface Node {
  id: ID!
}

interface Named {
  name: String!
}

type User implements Node & Named {
  id: ID!
  name: String!
  role: Role!
  avatar(size: Int! = 64): String
  friends(first: Int!, after: String): [User!]!
  pets: [Pet!]!
}

type Dog implements Node & Named {
  id: ID!
  name: String!
  barks: Boolean!
}

type Cat implements Node & Named {
  id: ID!
  name: String!
  meows: Boolean!
}

type Repo implements Node {
  id: ID!
  stars: Int!
}

union Pet = Dog | Cat

union SearchResult = User | Repo

"""An interface nothing implements yet."""
interface Orphan {
  id: ID!
}

enum Role {
  ADMIN
  MEMBER
}

input UserFilter {
  role: Role
  nameContains: String
}

type Query {
  node(id: ID!): Node
  user(id: ID!): User
  users(filter: UserFilter, roles: [Role!]): [User!]!
  search(term: String!): [SearchResult!]!
  orphan: Orphan
}

type Mutation {
  rename(id: ID!, name: String!): User
}

type Subscription {
  userRenamed: User!
}
`

export interface CaseFile {
  readonly path: string
  readonly body: string
}

export interface CaseDiagnostic {
  readonly path: string
  readonly line: number
  readonly column: number
  readonly message: string
}

export interface ValidationGroup {
  readonly rule: string
  /** Which node a diagnostic points at, when graphql-js reports several. */
  readonly location?: string
  readonly valid: ReadonlyArray<ReadonlyArray<CaseFile>>
  readonly invalid: {
    readonly files: ReadonlyArray<CaseFile>
    readonly diagnostics: ReadonlyArray<CaseDiagnostic>
  }
}

const file = (body: string, path = "query.graphql"): CaseFile => ({ path, body })

export const validationGroups: ReadonlyArray<ValidationGroup> = [
  {
    rule: "fields exist on their parent type",
    valid: [[file(`query Viewer($id: ID!) {
  __typename
  user(id: $id) {
    __typename
    id
    name
    pets {
      __typename
      ... on Dog {
        barks
      }
    }
  }
  search(term: "x") {
    __typename
  }
}

mutation Rename {
  rename(id: "1", name: "n") {
    name
  }
}

subscription Renamed {
  userRenamed {
    id
  }
}
`)]],
    invalid: {
      files: [file(`query Viewer($id: ID!) {
  user(id: $id) {
    id
    homepage
    friends(first: 1) {
      zodiac
    }
  }
}
`)],
      diagnostics: [
        { path: "query.graphql", line: 4, column: 5, message: "Cannot query field \"homepage\" on type \"User\"." },
        { path: "query.graphql", line: 6, column: 7, message: "Cannot query field \"zodiac\" on type \"User\"." }
      ]
    }
  },
  {
    rule: "arguments exist and required arguments are provided",
    valid: [[file(`query Users {
  user(id: "1") {
    avatar
    small: avatar(size: 32)
    friends(first: 10) {
      id
    }
  }
  users {
    id
  }
}
`)]],
    invalid: {
      files: [file(`query Users {
  user(id: "1", locale: "en") {
    friends {
      id
    }
  }
  node {
    id
  }
}
`)],
      diagnostics: [
        { path: "query.graphql", line: 2, column: 17, message: "Unknown argument \"locale\" on field \"Query.user\"." },
        {
          path: "query.graphql",
          line: 3,
          column: 5,
          message: "Field \"friends\" argument \"first\" of type \"Int!\" is required, but it was not provided."
        },
        {
          path: "query.graphql",
          line: 7,
          column: 3,
          message: "Field \"node\" argument \"id\" of type \"ID!\" is required, but it was not provided."
        }
      ]
    }
  },
  {
    rule: "variables are defined, used and of input types",
    valid: [[file(`query Users($filter: UserFilter, $roles: [Role!], $first: Int!, $withPets: Boolean!) {
  users(filter: $filter, roles: $roles) {
    ...UserFriends
    pets @include(if: $withPets) {
      __typename
    }
  }
}

fragment UserFriends on User {
  friends(first: $first) {
    id
  }
}
`)]],
    invalid: {
      files: [file(`query Users($unused: String, $viewer: User, $page: PageToken) {
  user(id: $viewer) {
    friends(first: 1, after: $page) {
      id
    }
  }
  users(filter: $filter) {
    id
  }
}
`)],
      diagnostics: [
        {
          path: "query.graphql",
          line: 1,
          column: 13,
          message: "Variable \"$unused\" is never used in operation \"Users\"."
        },
        {
          path: "query.graphql",
          line: 1,
          column: 39,
          message: "Variable \"$viewer\" cannot be non-input type \"User\"."
        },
        { path: "query.graphql", line: 1, column: 52, message: "Unknown type \"PageToken\"." },
        {
          path: "query.graphql",
          line: 7,
          column: 17,
          message: "Variable \"$filter\" is not defined by operation \"Users\"."
        }
      ]
    }
  },
  {
    rule: "fragments are defined, used, acyclic and spread onto a possible type",
    location: "a cycle is reported once, at the first spread on its path",
    valid: [[file(`query Search {
  search(term: "x") {
    ...NodeId
    ... on User {
      ...UserName
      pets {
        ...PetName
      }
    }
  }
}

fragment NodeId on Node {
  id
}

fragment UserName on User {
  name
  ...NodeId
}

fragment PetName on Named {
  name
}
`)]],
    invalid: {
      files: [file(`query Viewer {
  user(id: "1") {
    ...Missing
    ...DogFields
    ... on Repo {
      stars
    }
    ... on Gizmo {
      id
    }
    ...A
  }
}

fragment DogFields on Dog {
  barks
}

fragment A on User {
  ...B
}

fragment B on User {
  ...A
}

fragment Unused on User {
  id
}
`)],
      diagnostics: [
        { path: "query.graphql", line: 3, column: 8, message: "Unknown fragment \"Missing\"." },
        {
          path: "query.graphql",
          line: 4,
          column: 5,
          message:
            "Fragment \"DogFields\" cannot be spread here as objects of type \"User\" can never be of type \"Dog\"."
        },
        {
          path: "query.graphql",
          line: 5,
          column: 5,
          message: "Fragment cannot be spread here as objects of type \"User\" can never be of type \"Repo\"."
        },
        { path: "query.graphql", line: 8, column: 12, message: "Unknown type \"Gizmo\"." },
        {
          path: "query.graphql",
          line: 20,
          column: 3,
          message: "Cannot spread fragment \"A\" within itself via \"B\"."
        },
        { path: "query.graphql", line: 27, column: 1, message: "Fragment \"Unused\" is never used." }
      ]
    }
  },
  {
    rule: "operations are named and operation and fragment names are unique",
    location: "every definition sharing a name is reported at its name",
    valid: [[file(`query Viewer {
  user(id: "1") {
    ...UserFields
  }
}

mutation Rename {
  rename(id: "1", name: "n") {
    ...UserFields
  }
}

fragment UserFields on User {
  id
}
`)]],
    invalid: {
      files: [file(`{
  user(id: "1") {
    ...UserFields
  }
}

query Viewer {
  user(id: "1") {
    ...UserFields
  }
}

query Viewer {
  user(id: "2") {
    name
  }
}

mutation {
  rename(id: "1", name: "n") {
    id
  }
}

fragment UserFields on User {
  id
}

fragment UserFields on User {
  name
}
`)],
      diagnostics: [
        {
          path: "query.graphql",
          line: 1,
          column: 1,
          message: "Anonymous operations are not supported, name this operation."
        },
        { path: "query.graphql", line: 7, column: 7, message: "There can be only one operation named \"Viewer\"." },
        { path: "query.graphql", line: 13, column: 7, message: "There can be only one operation named \"Viewer\"." },
        {
          path: "query.graphql",
          line: 19,
          column: 1,
          message: "Anonymous operations are not supported, name this operation."
        },
        {
          path: "query.graphql",
          line: 25,
          column: 10,
          message: "There can be only one fragment named \"UserFields\"."
        },
        { path: "query.graphql", line: 29, column: 10, message: "There can be only one fragment named \"UserFields\"." }
      ]
    }
  },
  {
    rule: "operation and fragment names are unique across files",
    location: "every definition sharing a name is reported at its name, in its own file",
    valid: [[
      file(
        `query Viewer {
  user(id: "1") {
    ...ViewerFields
  }
}

fragment ViewerFields on User {
  id
}
`,
        "viewer.graphql"
      ),
      file(
        `query Friends {
  user(id: "1") {
    ...FriendFields
  }
}

fragment FriendFields on User {
  friends(first: 10) {
    id
  }
}
`,
        "friends.graphql"
      )
    ]],
    invalid: {
      files: [
        file(
          `query Viewer {
  user(id: "1") {
    ...UserFields
  }
}

fragment UserFields on User {
  id
}
`,
          "a.graphql"
        ),
        file(
          `query Viewer {
  user(id: "2") {
    ...UserFields
  }
}

fragment UserFields on User {
  name
}
`,
          "b.graphql"
        )
      ],
      diagnostics: [
        { path: "a.graphql", line: 1, column: 7, message: "There can be only one operation named \"Viewer\"." },
        { path: "a.graphql", line: 7, column: 10, message: "There can be only one fragment named \"UserFields\"." },
        { path: "b.graphql", line: 1, column: 7, message: "There can be only one operation named \"Viewer\"." },
        { path: "b.graphql", line: 7, column: 10, message: "There can be only one fragment named \"UserFields\"." }
      ]
    }
  },
  {
    rule: "leaf fields have no selection set and composite fields have one",
    location: "a leaf field is reported at its selection set, a composite field at the field",
    valid: [[file(`query Viewer {
  user(id: "1") {
    id
    role
    pets {
      __typename
    }
  }
}
`)]],
    invalid: {
      files: [file(`query Viewer {
  user(id: "1") {
    id {
      value
    }
    role {
      name
    }
    pets
  }
  node(id: "1")
}
`)],
      diagnostics: [
        {
          path: "query.graphql",
          line: 3,
          column: 8,
          message: "Field \"id\" must not have a selection since type \"ID!\" has no subfields."
        },
        {
          path: "query.graphql",
          line: 6,
          column: 10,
          message: "Field \"role\" must not have a selection since type \"Role!\" has no subfields."
        },
        {
          path: "query.graphql",
          line: 9,
          column: 5,
          message:
            "Field \"pets\" of type \"[Pet!]!\" must have a selection of subfields. Did you mean \"pets { ... }\"?"
        },
        {
          path: "query.graphql",
          line: 11,
          column: 3,
          message: "Field \"node\" of type \"Node\" must have a selection of subfields. Did you mean \"node { ... }\"?"
        }
      ]
    }
  },
  {
    rule: "fields sharing a response key in one selection set are the same field with the same arguments",
    location: "the later of the two fields",
    valid: [[file(`query Viewer {
  user(id: "1") {
    name
    name
    avatar(size: 32)
    avatar(size: 32)
    large: avatar(size: 128)
    friends(first: 1) {
      id
    }
  }
  other: user(id: "2") {
    id
  }
}
`)]],
    invalid: {
      files: [file(`query Viewer {
  user(id: "1") {
    name: id
    name
    avatar(size: 32)
    avatar(size: 64)
  }
}
`)],
      diagnostics: [
        {
          path: "query.graphql",
          line: 4,
          column: 5,
          message:
            "Fields \"name\" conflict because \"id\" and \"name\" are different fields. Use different aliases on the fields to fetch both if this was intentional."
        },
        {
          path: "query.graphql",
          line: 6,
          column: 5,
          message:
            "Fields \"avatar\" conflict because they have differing arguments. Use different aliases on the fields to fetch both if this was intentional."
        }
      ]
    }
  },
  {
    rule: "fragments resolve across files",
    location: "a diagnostic is reported in the file holding the offending node",
    valid: [[
      file(
        `query Viewer($id: ID!) {
  ...ViewerUser
}
`,
        "viewer.graphql"
      ),
      file(
        `fragment ViewerUser on Query {
  user(id: $id) {
    ...UserName
  }
}

fragment UserName on User {
  name
}
`,
        "fragments.graphql"
      )
    ]],
    invalid: {
      files: [
        file(
          `query Viewer {
  users {
    ...A
  }
  ...ViewerUser
}

fragment B on User {
  ...A
}
`,
          "viewer.graphql"
        ),
        file(
          `fragment ViewerUser on Query {
  user(id: $id) {
    id
  }
}

fragment A on User {
  ...B
}
`,
          "fragments.graphql"
        )
      ],
      diagnostics: [
        {
          path: "viewer.graphql",
          line: 9,
          column: 3,
          message: "Cannot spread fragment \"B\" within itself via \"A\"."
        },
        {
          path: "fragments.graphql",
          line: 2,
          column: 12,
          message: "Variable \"$id\" is not defined by operation \"Viewer\"."
        }
      ]
    }
  },
  {
    rule: "operations and fragments share one name namespace",
    location: "every definition sharing a name is reported at its name, in its own file",
    valid: [[
      file(
        `query Viewer {
  user(id: "1") {
    ...ViewerFields
  }
}

fragment ViewerFields on User {
  id
}
`,
        "viewer.graphql"
      ),
      file(
        `query Friends {
  user(id: "1") {
    name
  }
}
`,
        "friends.graphql"
      )
    ]],
    invalid: {
      files: [
        file(
          `query UserFields {
  user(id: "1") {
    ...UserFields
    ...Friends
  }
}

fragment UserFields on User {
  id
}

fragment Friends on User {
  name
}
`,
          "a.graphql"
        ),
        file(
          `query Friends {
  user(id: "2") {
    id
  }
}
`,
          "b.graphql"
        )
      ],
      diagnostics: [
        {
          path: "a.graphql",
          line: 1,
          column: 7,
          message: "There can be only one operation or fragment named \"UserFields\"."
        },
        {
          path: "a.graphql",
          line: 8,
          column: 10,
          message: "There can be only one operation or fragment named \"UserFields\"."
        },
        {
          path: "a.graphql",
          line: 12,
          column: 10,
          message: "There can be only one operation or fragment named \"Friends\"."
        },
        {
          path: "b.graphql",
          line: 1,
          column: 7,
          message: "There can be only one operation or fragment named \"Friends\"."
        }
      ]
    }
  },
  {
    rule: "a composite type overlaps itself, even with no possible types",
    valid: [[file(`query Orphan {
  orphan {
    ... on Orphan {
      id
    }
    ...OrphanId
  }
}

fragment OrphanId on Orphan {
  id
}
`)]],
    invalid: {
      files: [file(`query Viewer {
  user(id: "1") {
    ... on Orphan {
      id
    }
  }
}
`)],
      diagnostics: [
        {
          path: "query.graphql",
          line: 3,
          column: 5,
          message: "Fragment cannot be spread here as objects of type \"User\" can never be of type \"Orphan\"."
        }
      ]
    }
  }
]
