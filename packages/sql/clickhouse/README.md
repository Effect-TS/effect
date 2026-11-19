# @effect/sql-clickhouse

An Effect SQL client for [ClickHouse](https://clickhouse.com), built on the [`@clickhouse/client`](https://clickhouse.com/docs/integrations/javascript) and [`@clickhouse/client-web`](https://clickhouse.com/docs/integrations/javascript#web-version) libraries.

## Installation

```sh
npm install effect @effect/sql-clickhouse
```

## Runtimes

`ClickhouseClient` runs on Node.js and uses [`@clickhouse/client`](https://clickhouse.com/docs/integrations/javascript). On runtimes without Node built-ins, such as Cloudflare Workers, use `ClickhouseWebClient`, which talks to ClickHouse over `fetch` through [`@clickhouse/client-web`](https://clickhouse.com/docs/integrations/javascript#web-version).

```ts
import * as ClickhouseWebClient from "@effect/sql-clickhouse/ClickhouseWebClient"
import { Effect } from "effect"
import { SqlClient } from "effect/sql"

const program = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  return yield* sql`SELECT ${1} AS n`
}).pipe(Effect.provide(ClickhouseWebClient.layer({ url: "https://clickhouse.example.com:8443" })))
```

Import `ClickhouseWebClient` from `@effect/sql-clickhouse/ClickhouseWebClient`, not from the package root, which also exports the Node client.

Both clients provide the generic `SqlClient` and work with `ClickhouseMigrator`. Their ClickHouse-specific services are separate: code using `param`, `asCommand` or `insertQuery` must select one, while code using only `SqlClient` works with either.

Interruption aborts the request and attempts server-side cancellation. Failed kills are ignored; kill requests that exceed five seconds are aborted.

Building the layer checks the connection with a query, so on Workers build it once and reuse it rather than once per request.

## Links

- [Website](https://effect.website): documentation, guides, and news.
- [Reference](https://effect.website/docs/v4/api/sql-clickhouse): API documentation for this package.
- [Discord](https://discord.gg/effect-ts): ask questions, share what you're building, and talk to the core team.
- [Community](https://effect.website/community-hub): meetups and events, or bring Effect to your own.
- [Issues](https://github.com/Effect-TS/effect/issues): bug reports and feature requests.

## Let's talk

Whether your team is considering Effect, rolling it out, or already running it in production, we'd love to hear from you: what you're building, what works, and what you need from Effect next.

- **Talk to the maintainers.** Introduce your team on [Discord](https://discord.gg/effect-ts) or email [contact@effectful.co](mailto:contact@effectful.co). We're happy to connect privately on Slack or Discord for feedback and help with adoption.
- **Production support.** We're exploring how to better support teams running Effect in production. If your organization has specific support needs, let's discuss them.
- **Adoption help.** Our [adoption partners](https://effect.website/adoption-partners) offer implementation, consulting, team extension, training, and commercial support.
