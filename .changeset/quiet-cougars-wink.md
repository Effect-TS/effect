---
"@effect/sql-sqlite-react-native": minor
"@effect/sql-sqlite-node": minor
"@effect/sql-sqlite-wasm": minor
"@effect/sql-clickhouse": minor
"@effect/sql-sqlite-bun": minor
"@effect/sql-kysely": minor
"@effect/sql-sqlite-do": minor
"@effect/sql-libsql": minor
"@effect/sql-mysql2": minor
"@effect/sql-mssql": minor
"@effect/sql-d1": minor
"@effect/sql-pg": minor
"@effect/sql": minor
"@effect/opentelemetry": patch
"@effect/platform": patch
"effect": patch
---

Updated deprecated OTel Resource attributes names and values.

Many of the attributes have undergone the process of deprecation not once, but twice. Most of the constants holding attribute names have been renamed. These are minor changes.

Additionally, there were numerous changes to the attribute keys themselves. These changes can be considered major.

In the `@opentelemetry/semantic-conventions` package, new attributes having ongoing discussion about them are going through a process called incubation, until a consensus about their necessity and form is reached. Otel team [recommends](https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv) devs to copy them directly into their code. Luckily, it's not necessary because all of the new attribute names and values came out of this process (some of them were changed again) and are now considered stable.

## Reasoning for minor version bump

| Package                    | Major attribute changes                                                       | Major value changes               |
| -------------------------- | ----------------------------------------------------------------------------- | --------------------------------- |
| Clickhouse client          | `db.system` -> `db.system.name` <br/> `db.name` -> `db.namespace`             |                                   |
| MsSQL client               | `db.system` -> `db.system.name` <br/> `db.name` -> `db.namespace`             | `mssql` -> `microsoft.sql_server` |
| MySQL client               | `db.system` -> `db.system.name` <br/> `db.name` -> `db.namespace`             |                                   |
| Pg client                  | `db.system` -> `db.system.name` <br/> `db.name` -> `db.namespace`             |                                   |
| Bun SQLite client          | `db.system` -> `db.system.name`                                               |                                   |
| Node SQLite client         | `db.system` -> `db.system.name`                                               |                                   |
| React.Native SQLite client | `db.system` -> `db.system.name`                                               |                                   |
| Wasm SQLite client         | `db.system` -> `db.system.name`                                               |                                   |
| SQLite Do client           | `db.system` -> `db.system.name`                                               |                                   |
| LibSQL client              | `db.system` -> `db.system.name`                                               |                                   |
| D1 client                  | `db.system` -> `db.system.name`                                               |                                   |
| Kysely client              | `db.statement` -> `db.query.text`                                             |                                   |
| @effect/sql                | `db.statement` -> `db.query.text` <br/> `db.operation` -> `db.operation.name` |                                   |
