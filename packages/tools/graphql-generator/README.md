# @effect/graphql-generator

Generates typed operations for the experimental `effect/graphql` client from
`.graphql` documents and a GraphQL schema. The lexer, parser and validation are
built in; `graphql-js` isn't needed.

## Installation

```sh
npm install effect @effect/platform-node
npm install --save-dev @effect/graphql-generator
```

The package provides the `graphqlgen` command. It loads `graphql.config.ts`
with a plain `import()`, so it needs Bun, Deno, or Node.js 22.18 or later
(where type stripping is on by default). Under Node the config can only use
erasable TypeScript syntax: no `enum`, no `namespace` with values, no
constructor parameter properties.

## Configuration

Put a `graphql.config.ts` in the directory you run `graphqlgen` from:

```ts
import { defineConfig } from "@effect/graphql-generator/Config"

export default defineConfig({
  // An SDL file (.graphql) or an introspection result (.json)
  schema: "./schema/github.graphql",
  // Glob patterns for the operation documents
  documents: ["src/**/*.graphql"],
  // One Schema codec per custom scalar, as "<module>#<export>"
  scalars: {
    GitObjectID: "effect/Schema#String"
  }
})
```

`schema` and `documents` are the keys graphql-config reads, so the VS Code
GraphQL extension can share the file.

| Key               | Description                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema`          | The schema file, relative to the config file. It is never treated as a document.                                                                                   |
| `documents`       | Glob patterns (`*`, `**`, `?`, `{a,b}`) relative to the config file. `node_modules` and dot-directories are skipped. Documents hold only operations and fragments. |
| `scalars`         | Optional. A codec per custom scalar; can also override the built-in `Int`, `Float` and `ID`.                                                                       |
| `shared`          | Optional. Where the shared module goes. Defaults to the schema's name next to it: `github.graphql` or `github.json` gives `github.graphql.ts`.                     |
| `importExtension` | Optional. `".ts"` (default), `".js"` or `""`, used in imports between generated files and to relative scalar modules.                                              |

One config means one schema: for two schemas, write two config files and run
`graphqlgen --config <file>` for each.

### Scalars

Each scalar maps to a `Schema` codec, used for variables and results alike. The
value is a `"<module>#<export>"` string because the generator emits an
`import` for it. A relative module resolves against the config file and is
rewritten relative to the shared module; a bare module is imported as written.
The generator doesn't check the target; `tsc` does.

Unless overridden, `Int` is a 32-bit integer, `Float` a finite number and `ID`
a string. Custom scalars named exactly `DateTime` and `URI` default to
`Schema.DateTimeUtcFromString` and `Schema.String`. A `scalars` entry overrides
any of these defaults. Other custom scalars without a mapping decode as
`Schema.Json`, with one warning listing every unmapped scalar the operations
reach. Defaulted scalars are not included in that warning.

## Generated files

`foo.graphql` generates `foo.graphql.ts` next to it, exporting:

- a `GraphQL.query`, `GraphQL.mutation` or `GraphQL.subscription` per
  operation, carrying the compact document and the variables and result
  Schemas, plus a type namespace such as `RepoIssues.Variables` and
  `RepoIssues.Result`. Queries and mutations give the document as a
  `GraphQL.DocumentTemplate`, which marks the variable and fragment names a
  batch would rename; the operation joins it into the same compact text.
- a Schema per fragment
- a `Schema.Opaque` class per nested object selection and per member of an
  interface or union selection, so editor hovers show a name instead of the
  whole type
- `FooGraphQLGroup`, a `GraphQLGroup` with every operation in the file

A nested selection's class is named after its GraphQL type, such as `Issue`
or `User`, inside fragments too. Every class is a top-level export of the
file, so operations and fragments in one file draw from the same names. The
member covering the types an interface or union selection doesn't name ends
in `Other`, such as `EventOther`. An interface or union selection without any
`... on` type conditions is one struct rather than a union, so its class takes
the abstract type's name with no `Other`, such as `Event`.

Selections of a type share one class across the whole file when they select
the same fields under the same response keys, with the same nested
selections and `@skip` / `@include` optionality, in any order. When different
selections would get the same name, or a name is already taken by an
operation, fragment or import in the file, by the file's group or by
`Schema`, `GraphQL`, `GraphQLGroup` or `Shared`, each adds its field's
response key (`AuthorUser`), then parent response keys one at a time
(`CommentsAuthorUser`), then the operation or fragment name
(`RepoIssuesCommentsAuthorUser`), until the names are free. A shared class
uses the path of its first occurrence. A clash left after all of that is an
error: alias the field.

The shared module holds only the scalars, enums, input objects and
`__typename` unions the operations reach. Commit the generated files, and
exclude `*.graphql.ts` from your linter and formatter: the output has one fixed
style, and a reformatted file shows up as out of date in `graphqlgen --check`.

After a successful run, `graphqlgen` deletes each `*.graphql.ts` under the
`documents` glob roots that carries its generated header and has no `.graphql`
source left. Files without the header are never touched.

## CLI

```sh
graphqlgen [--config <path>] [--watch | --check]
```

| Flag             | Description                                                                             |
| ---------------- | --------------------------------------------------------------------------------------- |
| `--config`, `-c` | The config file. Defaults to `graphql.config.ts` in the current directory.              |
| `--watch`, `-w`  | Keep running and regenerate on changes.                                                 |
| `--check`        | Write nothing; list every file that would be created, updated or deleted. Use it in CI. |

Diagnostics go to stderr as `file:line:col: error|warning: message` with a code
excerpt. Any error means nothing is written.

| Exit code | Meaning                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| `0`       | Success, including runs with warnings only.                                                                  |
| `1`       | Generation reported an error, a file couldn't be read or written, or `--check` found out-of-date files.      |
| `2`       | Invalid CLI usage (including `--watch --check`), or the config couldn't be loaded or doesn't fit the schema. |

### Watch mode

`graphqlgen --watch` runs once, then watches the config file, the schema file
and the static prefix of each `documents` glob (`src` for `src/**/*.graphql`).
Changes are debounced by about 50 ms, and only files whose bytes changed are
written. A cycle with errors writes nothing, so the last good output stays; a
successful one prints a line such as `regenerated 3 files, deleted 1`.

Editing the config re-imports it, keeping the previous config if the new one
fails to load. Only a config that fails at startup exits (with code `2`).
Modules the config imports are not reloaded: restart after editing them.

## Using the generated code

Merge the groups you need and build a client, a service with one method per
operation:

```ts
import { Context, Layer } from "effect"
import { GraphQLClient, GraphQLGroup, GraphQLProtocol } from "effect/graphql"
import { FetchHttpClient } from "effect/http"
import { IssuesGraphQLGroup } from "./src/issues.graphql.ts"
import { ViewerGraphQLGroup } from "./src/viewer.graphql.ts"

export class GitHub extends Context.Service<GitHub>()("app/GitHub", {
  make: GraphQLClient.make(GraphQLGroup.merge(IssuesGraphQLGroup, ViewerGraphQLGroup))
}) {
  static readonly layer = Layer.effect(GitHub, GitHub.make).pipe(
    Layer.provide(GraphQLProtocol.layerHttp({ url: "https://api.github.com/graphql" })),
    Layer.provide(FetchHttpClient.layer)
  )
}

// const { viewer } = yield* github.Viewer()
// const { repository } = yield* github.RepoIssues({ owner: "Effect-TS", name: "effect" })
```

The getting-started example under `ai-docs/src/52_graphql` shows auth
middleware and paging; the `effect/graphql` API reference covers
subscriptions, errors and `{ partial: true }` for responses that carry both
`data` and `errors`.

### Paging and `$after`

`GraphQLClient.items` and `GraphQLClient.pages` page forward through a cursor
connection. Name the cursor variable `$after`, declare it as a nullable
`String`, pass it to the connection and select `pageInfo`:

```graphql
query RepoIssues($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        number
        title
      }
    }
  }
}
```

```ts
const issues = GraphQLClient.items(github.RepoIssues, {
  variables: { owner: "Effect-TS", name: "effect" }, // everything except `after`
  connection: (result) => result.repository?.issues
})
```

An operation without `$after` or `pageInfo`, or without `nodes` for `items`,
doesn't compile. The generator needs nothing beyond this convention.

### Batching

`GraphQLResolver` from `effect/graphql` collects concurrent lookups and makes
one call to a generated operation, DataLoader style. Generate
`repos.graphql.ts` from this GitHub document. Create the client and reusable
resolver in the `GitHub` service:

```graphql
query RepoNodes($ids: [ID!]!) {
  nodes(ids: $ids) {
    __typename
    ... on Repository { id nameWithOwner }
  }
}
```

```ts
import { Context, Effect, Layer, RequestResolver } from "effect"
import { GraphQLClient, GraphQLGroup, GraphQLProtocol, GraphQLResolver } from "effect/graphql"
import { FetchHttpClient } from "effect/http"
import { IssuesGraphQLGroup } from "./src/issues.graphql.ts"
import { ReposGraphQLGroup } from "./src/repos.graphql.ts"
import { ViewerGraphQLGroup } from "./src/viewer.graphql.ts"

export class GitHub extends Context.Service<GitHub>()("app/GitHub", {
  make: Effect.gen(function*() {
    const client = yield* GraphQLClient.make(
      GraphQLGroup.merge(IssuesGraphQLGroup, ViewerGraphQLGroup, ReposGraphQLGroup)
    )
    const RepoById = GraphQLResolver.ordered(client.RepoNodes, {
      variables: (ids: ReadonlyArray<string>) => ({ ids }),
      path: ["nodes"],
      typename: "Repository"
    }).pipe(RequestResolver.batchN(100)) // GitHub's nodes(ids:) limit
    return { ...client, getRepo: GraphQLResolver.request(RepoById) }
  })
}) {
  static readonly layer = Layer.effect(GitHub, GitHub.make).pipe(
    Layer.provide(GraphQLProtocol.layerHttp({ url: "https://api.github.com/graphql" })),
    Layer.provide(FetchHttpClient.layer)
  )
}

export const repoNames = Effect.fn("repoNames")(function*(ids: ReadonlyArray<string>) {
  const github = yield* GitHub
  const repos = yield* Effect.forEach(ids, github.getRepo, { concurrency: "unbounded" })
  return repos.map((repo) => repo.nameWithOwner)
})

export const program = repoNames(["R_1", "R_2"]).pipe(Effect.provide(GitHub.layer))
```

`ordered` matches the `nodes` list to the ids by position. `path` leads from
the result to the list, one autocompleted key at a time, and `typename`
narrows each entry to `Repository`. A `null` entry or a node of another type
fails only its own lookup, with `Cause.NoSuchElementError`, and a GraphQL
error at `["nodes", i]` fails only entry `i`. Any other GraphQL error, and
transport or decoding failures, fail the whole batch. Middleware still run,
because the resolver calls the generated client.

Each batch makes one call with the services of one of its lookups. When a
middleware `requires` a per-request service, such as the signed-in user,
`ordered` and `findById` require a `batchKey` that reads it. Only lookups
with equal keys share a call, so one user's lookups never go out with another
user's token:

```ts
const RepoById = GraphQLResolver.ordered(client.RepoNodes, {
  variables: (ids: ReadonlyArray<string>) => ({ ids }),
  path: ["nodes"],
  typename: "Repository",
  batchKey: (context) => Context.get(context, CurrentUser).id
})
```

Without services, `batchKey` isn't accepted and all lookups share a batch.
A middleware that reads a `Context.Reference` with a default value doesn't
add it to the services, so `batchKey` doesn't cover it.

When results come back in any order, as from a search, `findById` matches them
by a key read from each result. Add a `SearchRepos` operation to `repos.graphql`,
then create its resolver inside `GitHub.make`, after the client:

```ts
// search(query: $query, type: REPOSITORY, first: 50) { pageInfo { hasNextPage } nodes { ... } }
const RepoByName = GraphQLResolver.findById(client.SearchRepos, {
  key: (repo) => repo.nameWithOwner,
  variables: (names) => ({ query: names.map((name) => `repo:${name}`).join(" ") }),
  path: ["search", "nodes"],
  typename: "Repository"
}).pipe(RequestResolver.batchN(50))
const getRepoByName = GraphQLResolver.request(RepoByName)
```

Include `getRepoByName` in the returned service and use it with `Effect.forEach`,
as with `getRepo` above. Write `key` before `variables`, so that the key type is
inferred from it.

A list field returns one page, so a key past the end of the page would look
missing. Set the page size (`first`, `limit`) and `RequestResolver.batchN` to
the same value; when the object holding the list reports
`pageInfo.hasNextPage: true`, the whole batch fails instead.

- For the simplest option, call a method per item with
  `Effect.forEach(items, f, { concurrency: 4 })`, at the cost of one request
  (and rate-limit charge) per item.

See [the RequestResolver example](../../../ai-docs/src/05_batching/10_request-resolver.ts).

### Aliased batching

Some lookups have no list field. GitHub finds a pull request by repository
and number, one at a time. `GraphQLResolver.aliased` repeats a generated query
under aliases in one request, so each slice still has the generated types.
Add this operation to `repos.graphql`:

```graphql
query PullRequest($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) { number title }
  }
}
```

Then create the resolver inside `GitHub.make`, after the client:

```ts
const PullRequests = GraphQLResolver.aliased(client.PullRequest)
const getPullRequest = GraphQLResolver.request(PullRequests)
```

`getPullRequest` takes the operation's variables and returns the decoded
result, like `getRepo` above. Concurrent calls go out as one `POST`, built
from the document template the generator emits:

```graphql
query PullRequest($_0_owner: String!, $_0_name: String!, $_0_number: Int!, $_1_owner: String!, ...) {
  _0_repository: repository(owner: $_0_owner, name: $_0_name) { pullRequest(number: $_0_number) { number title } }
  _1_repository: repository(owner: $_1_owner, name: $_1_name) { pullRequest(number: $_1_number) { number title } }
}
```

The response is split by prefix and each slice is decoded with the generated
result Schema. A GraphQL error under `_1_repository` fails only the second
call; an error without a `path` fails them all. Calls whose variables encode
to the same JSON share a slice. A batch holds 10 slices unless you pipe
`RequestResolver.batchN`, because GitHub's query cost and timeouts grow with
its size.

A non-null root field fails every slice when an error happens under it, since
the `null` reaches `data`. GitHub's `repository` and `pullRequest` are
nullable, so they don't. Middleware that hash the query should hash
`request.query`, which holds the batched document, and allowlists of trusted
documents can't cover batches.

## Links

- [Website](https://effect.website): documentation, guides, and news.
- [Reference](https://effect.website/docs/v4/api/graphql-generator): API documentation for this package.
- [Discord](https://discord.gg/effect-ts): ask questions, share what you're building, and talk to the core team.
- [Community](https://effect.website/community-hub): meetups and events, or bring Effect to your own.
- [Issues](https://github.com/Effect-TS/effect/issues): bug reports and feature requests.

## Let's talk

Whether your team is considering Effect, rolling it out, or already running it in production, we'd love to hear from you: what you're building, what works, and what you need from Effect next.

- **Talk to the maintainers.** Introduce your team on [Discord](https://discord.gg/effect-ts) or email [contact@effectful.co](mailto:contact@effectful.co). We're happy to connect privately on Slack or Discord for feedback and help with adoption.
- **Production support.** We're exploring how to better support teams running Effect in production. If your organization has specific support needs, let's discuss them.
- **Adoption help.** Our [adoption partners](https://effect.website/adoption-partners) offer implementation, consulting, team extension, training, and commercial support.
