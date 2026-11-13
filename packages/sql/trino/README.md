# @effect/sql-trino

An Effect SQL client for [Trino](https://trino.io), speaking the Trino client REST protocol over Effect's `HttpClient`, so it runs on any runtime that provides one, including Cloudflare Workers.

## Installation

```sh
npm install effect @effect/sql-trino
```

## Limitations

- **Transactions.** `withTransaction` uses Trino transactions (`X-Trino-Transaction-Id`). Trino has no savepoints, so a nested `withTransaction` fails with a `SqlError`. Many connectors refuse writes inside an explicit transaction (the `memory` connector reports "Catalog only supports writes using autocommit"), so check the connector you write to.
- **No `RETURNING`, no `updateValues`.** `SqlModel`'s `insert` and `update` rely on `RETURNING`; use `insertVoid` or `updateVoid`, then `findById`. `UPDATE` and `DELETE` depend on the connector.
- **Session.** Statements outside a transaction share one client-side session and run concurrently, so concurrent `USE` or `SET SESSION` statements are last-writer-wins. Run session work on a connection from `reserve`, or in a transaction.
- **Migrator.** `TrinoMigrator` keeps its ledger in an unqualified table, so the session needs a catalog and schema whose connector supports `CREATE TABLE` and `INSERT` (for example `memory` or `iceberg`).
- **Modules that pick SQL by dialect.** The `effect` modules below choose their SQL with `onDialectOrElse` and have no Trino branch, so Trino runs their SQLite SQL (primary keys, `ON CONFLICT`, `RETURNING`, `BLOB`), which Trino does not accept. They are not supported on Trino and not tested with it: `effect/persistence/Persistence`, `KeyValueStore.layerSql`, `PersistedQueue`, `effect/eventlog` (`SqlEventJournal`, `SqlEventLogServerEncrypted`, `SqlEventLogServerUnencrypted`) and `effect/cluster` (`SqlMessageStorage`, `SqlRunnerStorage`).

## Links

- [Website](https://effect.website): documentation, guides, and news.
- [Reference](https://effect.website/docs/v4/api/sql-trino): API documentation for this package.
- [Discord](https://discord.gg/effect-ts): ask questions, share what you're building, and talk to the core team.
- [Community](https://effect.website/community-hub): meetups and events, or bring Effect to your own.
- [Issues](https://github.com/Effect-TS/effect/issues): bug reports and feature requests.

## Let's talk

Whether your team is considering Effect, rolling it out, or already running it in production, we'd love to hear from you: what you're building, what works, and what you need from Effect next.

- **Talk to the maintainers.** Introduce your team on [Discord](https://discord.gg/effect-ts) or email [contact@effectful.co](mailto:contact@effectful.co). We're happy to connect privately on Slack or Discord for feedback and help with adoption.
- **Production support.** We're exploring how to better support teams running Effect in production. If your organization has specific support needs, let's discuss them.
- **Adoption help.** Our [adoption partners](https://effect.website/adoption-partners) offer implementation, consulting, team extension, training, and commercial support.
