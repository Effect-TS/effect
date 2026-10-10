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
    DateTime: "effect/Schema#DateTimeUtcFromString",
    URI: "./src/scalars.ts#Uri"
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
a string. A custom scalar without a mapping decodes as `Schema.Json`, with one
warning listing every unmapped scalar the operations reach.

## Generated files

`foo.graphql` generates `foo.graphql.ts` next to it, exporting:

- a `GraphQL.query`, `GraphQL.mutation` or `GraphQL.subscription` per
  operation, carrying the compact document and the variables and result
  Schemas, plus a type namespace such as `RepoIssues.Variables` and
  `RepoIssues.Result`
- a Schema per fragment
- `FooGraphQLGroup`, a `GraphQLGroup` with every operation in the file

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

The client doesn't merge operations into one aliased document at runtime; that
would need a GraphQL parser at runtime. Instead:

- call the method per item with `Effect.forEach(items, f, { concurrency: 4 })`,
  at the cost of one request (and rate-limit charge) per item
- fetch known IDs with `nodes(ids:)` and an inline fragment, up to 100 per
  request on GitHub
- as an escape hatch, send a hand-written aliased document with
  `GraphQLProtocol.execute` and decode `data` yourself; this skips the
  client's middleware

One missing item fails a whole `nodes(ids:)` or aliased batch, so call those
with `{ partial: true }` and match errors to items by `path`.

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
