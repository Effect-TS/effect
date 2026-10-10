# @effect/graphql-generator

Generates typed operations for the experimental `effect/graphql` client from
`.graphql` documents and a GraphQL schema. It has no dependencies beyond
`effect` and `@effect/platform-node`: the lexer, parser and validation are
built in, and `graphql-js` isn't needed.

## Installation

```sh
npm install effect @effect/platform-node
npm install --save-dev @effect/graphql-generator
```

The package provides the `graphqlgen` command.

### Runtime requirement

`graphqlgen` loads `graphql.config.ts` with a plain `import()`, so it needs a
runtime that runs TypeScript directly: Bun, Deno, or Node.js 22.18 or
later, where type stripping is on by default. Node only erases type
annotations, so the config can use only erasable TypeScript syntax: no `enum`,
no `namespace` with values, no constructor parameter properties. There is no
bundled loader. If Node can't load the config, `graphqlgen` explains why
instead of printing the raw error.

## Configuration

Put a `graphql.config.ts` in the directory you run `graphqlgen` from, and wrap
its default export in `defineConfig`:

```ts
import { defineConfig } from "@effect/graphql-generator/Config"

export default defineConfig({
  // An SDL file (.graphql) or an introspection result (.json)
  schema: "./schema/github.graphql",
  // Glob patterns for the operation documents
  documents: ["src/**/*.graphql"],
  // One Schema codec per custom scalar, as "<module>#<export>"
  scalars: {
    DateTime: "effect/Schema#DateTimeUtcFromString",
    URI: "./src/scalars.ts#Uri"
  }
})
```

`schema` and `documents` are the keys graphql-config reads, so the VS Code
GraphQL extension and other graphql-config tools can use the same file.

| Key               | Description                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`          | The schema file, relative to the config file. It is never treated as a document, even when a glob matches it.                                                                                        |
| `documents`       | Glob patterns (`*`, `**`, `?`, `{a,b}`) relative to the config file. `node_modules` and dot-directories are skipped. A document may only hold operations and fragments; type definitions are errors. |
| `scalars`         | Optional. A codec per custom scalar, which can also override the built-in `Int`, `Float` and `ID`. A key that isn't a scalar in the schema is a config error.                                        |
| `shared`          | Optional. Where the shared module goes. Defaults to the schema's name next to it: `github.graphql` or `github.json` gives `github.graphql.ts`.                                                       |
| `importExtension` | Optional. `".ts"` (default), `".js"` or `""`, used in imports between generated files and to relative scalar modules.                                                                                |

**One config means one schema.** To generate against two schemas, write two
config files and run `graphqlgen --config <file>` once for each.

The config is TypeScript, so it can read environment variables. There are no
command-line flags that override individual config fields.

### Scalars

Each scalar is mapped to a `Schema` codec, used for variables and results
alike. The value is a `"<module>#<export>"` string, not an imported Schema,
because the generator has to emit an `import` for it:

- A relative module (`./src/scalars.ts#Uri`) resolves against the config file
  and is rewritten relative to the shared module, with `importExtension`
  applied.
- A bare module (`effect/Schema#DateTimeUtcFromString`) is imported as written.
- The generator never imports or checks the target module; `tsc` does that when
  it checks the generated code.

`Int` maps to a 32-bit integer, `Float` to a finite number and `ID` to a
string unless you override them. A custom scalar without a mapping decodes as
`Schema.Json`, and one warning lists every unmapped scalar the operations
reach. The warning doesn't change the exit code.

## Generated files

`foo.graphql` generates `foo.graphql.ts` next to it, exporting:

- one `GraphQL.query`, `GraphQL.mutation` or `GraphQL.subscription` value per
  operation, carrying the compact document and the variables and result
  Schemas
- a type namespace per operation, such as `RepoIssues.Variables` and
  `RepoIssues.Result`
- a Schema per fragment
- `FooGroup`, a `GraphQLGroup` with every operation in the file

The shared module holds only the scalars, enums, input objects and
`__typename` unions the operations reach, so editing any document can change
it. Commit the generated files.

The output has one fixed, deterministic style and is not run through a
formatter. **Exclude `*.graphql.ts` from your linter and formatter**, for
example in `.oxlintrc.json` `ignorePatterns`, `.prettierignore` or the
`excludes` of `dprint.json`, so they don't rewrite the files and make
`graphqlgen --check` report them as out of date.

After a successful run, `graphqlgen` deletes each `*.graphql.ts` under the
`documents` glob roots that starts with its generated header and has no
`.graphql` source left. Files without the header are never touched.

## CLI

```sh
graphqlgen [--config <path>] [--watch | --check]
```

| Flag             | Description                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `--config`, `-c` | The config file. Defaults to `graphql.config.ts` in the current directory; parent directories aren't searched. |
| `--watch`, `-w`  | Keep running and regenerate on changes. See [Watch mode](#watch-mode).                                         |
| `--check`        | Generate in memory and write nothing. Lists every file that would be created, updated or deleted.              |

`--watch` and `--check` can't be combined.

Diagnostics go to stderr as `file:line:col: error|warning: message`, followed
by an excerpt of the source. If there is any error, nothing is written. Written
and deleted files are listed on stdout.

| Exit code | Meaning                                                                                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`       | Success, including runs with warnings only.                                                                                                                                                     |
| `1`       | Generation reported an error, a file couldn't be read or written, or `--check` found out-of-date files.                                                                                         |
| `2`       | Invalid CLI usage (including unknown flags or `--watch --check`), or the config couldn't be found, imported or decoded, or doesn't fit the schema, such as a `scalars` key that isn't a scalar. |

In CI, run `graphqlgen --check` to fail the build when the generated files are
stale.

### Watch mode

`graphqlgen --watch` runs once, then watches the config file, the schema file
and the static prefix of each `documents` glob (`src` for `src/**/*.graphql`).

- Changes are debounced by about 50 ms. The schema is parsed again only when it
  changes, and documents are cached by path and content. Every output is
  regenerated in memory, and only the files whose bytes changed are written.
- A cycle with errors prints its diagnostics and writes nothing, so the last
  good output stays on disk. A successful cycle prints one line, such as
  `regenerated 3 files, deleted 1`.
- The unmapped-scalars warning is printed again only when the set of unmapped
  scalars changes.
- If the first run fails, watching continues. Only a config that fails to load
  at startup exits, with code `2`.
- Editing the config re-imports it. If the new version fails to load, the
  error is printed and the previous config stays in use.
- **Modules that the config imports are not reloaded.** If `graphql.config.ts`
  imports another file, restart `graphqlgen --watch` after editing that file.
  Scalar modules aren't watched either; `tsc` picks up their changes.

## Using the generated code

Merge the groups you need and build a client. The client is a service with one
method per operation:

```ts
import { Context, Layer } from "effect"
import { GraphQLClient, GraphQLGroup, GraphQLProtocol } from "effect/graphql"
import { FetchHttpClient } from "effect/http"
import { IssuesGroup } from "./src/issues.graphql.ts"
import { ViewerGroup } from "./src/viewer.graphql.ts"

export class GitHub extends Context.Service<GitHub>()("app/GitHub", {
  make: GraphQLClient.make(GraphQLGroup.merge(IssuesGroup, ViewerGroup))
}) {
  static readonly layer = Layer.effect(GitHub, GitHub.make).pipe(
    Layer.provide(GraphQLProtocol.layerHttp({ url: "https://api.github.com/graphql" })),
    Layer.provide(FetchHttpClient.layer)
  )
}

// const { viewer } = yield* github.Viewer()
// const { repository } = yield* github.RepoIssues({ owner: "Effect-TS", name: "effect" })
```

The getting-started example under `ai-docs/src/52_graphql` in the Effect
repository shows an HTTP client with auth middleware and cursor paging. See
the `effect/graphql` API reference for subscriptions over graphql-ws or
graphql-sse and error handling.

### Paging and `$after`

`GraphQLClient.items` and `GraphQLClient.pages` page forward through a cursor
connection. The cursor variable is always named `$after`: declare it as a
nullable `String`, pass it to the connection, and select `pageInfo`:

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

A document without `$after` or `pageInfo`, or without `nodes` when used with
`items`, doesn't compile. The generator does nothing special for paging; the
convention is all it needs.

## Partial results

Any non-empty `errors` in a response fails a query or mutation with a
`ResponseError`, even when `data` is present. A field error turns the nearest
nullable field into `null`, and that `null` looks exactly like a genuine one.
On GitHub, a `NOT_FOUND` or SAML `FORBIDDEN` on one alias would otherwise read
as "no such repository".

Pass `{ partial: true }` to get the decoded `data` together with the errors:

```ts
// query Repositories {
//   effect: repository(owner: "Effect-TS", name: "effect") { nameWithOwner }
//   website: repository(owner: "Effect-TS", name: "website") { nameWithOwner }
// }
const { data, errors } = yield * github.Repositories(undefined, { partial: true })
```

`errors` is always present and may be empty. With `data: null` and errors the
call still fails with a `ResponseError`, and `data` that doesn't decode still
fails with a `DecodeError`. Subscriptions, `pages` and `items` don't accept
`partial`.

To find which item an error belongs to, read its `path`:

- `path[0]` is the response key, which is the alias when the document uses
  one. An error with `path: ["website"]` belongs to `data.website`.
- For `nodes(ids:)`, the item index is `path[1]`. An error with
  `path: ["nodes", 3]` belongs to `data.nodes[3]`, the fourth ID.
- `path` points at the field that errored, which can be below the field that
  became `null`, as in `["website", "owner", "login"]`. Match on a prefix of
  the path, not the whole path:

```ts
const errorsUnder = (errors: ReadonlyArray<GraphQLClientError.GraphQLError>, ...prefix: Array<string | number>) =>
  errors.filter((error) => prefix.every((key, i) => error.path?.[i] === key))

errorsUnder(errors, "website") // errors that hit the `website` alias
errorsUnder(errors, "nodes", 3) // errors that hit the fourth ID of a nodes(ids:) query
```

## Batching

`effect/graphql` does not merge operations into one aliased document at
runtime. Merging would mean rewriting documents with a dynamic alias per item,
which needs a GraphQL parser at runtime. The parser lives in the generator and
documents stay static. Using GitHub as the example, the options are:

1. **Concurrent single queries.** Call the method once per item with
   `Effect.forEach(items, f, { concurrency: 4 })`. Every item keeps its own
   typed result, error and retry. The cost is rate limit: N queries cost about
   N points, where one aliased document for the same N items costs about 1.

2. **`nodes(ids:)`**, when an earlier query returned node IDs. One request
   fetches up to 100 IDs, with an inline fragment selecting the fields:

   ```graphql
   query PullRequestsById($ids: [ID!]!) {
     nodes(ids: $ids) {
       ... on PullRequest {
         number
         title
         merged
       }
     }
   }
   ```

   Split longer lists with `Array.chunksOf(ids, 100)`.

3. **A hand-written document over the raw `GraphQLProtocol`**, as the escape
   hatch. Build the aliased document yourself, send it with
   `GraphQLProtocol.execute`, and decode `data` with your own result Schema.
   The raw protocol skips the client's middleware, so add headers yourself, and
   pass inputs as variables rather than interpolating them into the document.

One missing item fails a whole aliased or `nodes(ids:)` batch by default, so
call those with `{ partial: true }` and match errors to items as shown in
[Partial results](#partial-results). `GraphQLClient.pages` and `items` also fail
on the first page with errors; for paging that tolerates them, use
`Stream.paginate` over the partial method.

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
