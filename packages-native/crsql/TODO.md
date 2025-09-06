# Reactivity Integration Plan for @effect-native/crsql

This document describes how to integrate the `@effect/experimental/Reactivity` service with the CR‑SQLite service in this package.

The goals are:
- Provide a clear, stable key scheme for invalidation.
- Wrap mutation operations to invalidate the right keys.
- Expose ergonomic reactive accessors for common reads.
- Keep SQL responsibilities separated and testable.

## Key Scheme

Use simple string keys for broad invalidations and record-form keys for fine-grained invalidations by table and id.

- db version: `"crsql:dbVersion"`
- global changes: `"crsql:changes"`
- per-table/row: record key `"crsql:row:${table}"` with ids `[pkHex]`
- per-peer: record key `"crsql:peer"` with ids `[siteIdHex]`

Rationale: matches Reactivity’s record hashing (id-specific and broad key invalidations), and maps directly to our query shapes.

## Key Helper Builders

Export small helpers for consumers and internal usage:

- row(table: string, pkHex: string): `{ ["crsql:row:" + table]: [pkHex] }`
- table(table: string): `"crsql:row:" + table`
- peer(siteIdHex: string): `{ "crsql:peer": [siteIdHex] }`
- dbVersion(): `"crsql:dbVersion"`
- changes(): `"crsql:changes"`

These are pure helpers (no Reactivity dependency) so they are usable anywhere.

## Mutation Wiring

Wrap mutations with `Reactivity.mutation` so invalidations happen only after the effect completes successfully.

- applyChanges(changes):
  - Invalidate: `dbVersion`, `changes`, and aggregated per-table row keys.
  - Build a record like `{ ["crsql:row:" + table]: [pk1, pk2, ...] }` by coalescing the `changes` input. Use the hex PKs provided by the wire format.
- setPeerVersion(siteId, version, seq):
  - Invalidate: `{ "crsql:peer": [siteId] }`.
- finalize():
  - No invalidation needed.

Implementation sketch (pseudo):

```
yield* Reactivity.mutation(["crsql:dbVersion", "crsql:changes"])(
  sql.withTransaction(...)
)
// and additionally Reactivity.invalidate(recordByTable)
```

Note: Reactivity.mutation accepts a single key set; to combine record keys and array keys, call `mutation` for the array keys and then `invalidate` for the record keys, or vice versa. Alternatively, call a single `invalidate` with the record and a separate `invalidate` for the array.

## Reactive Accessors

Add convenience Streams on the `CrSql` service:

- reactiveDbVersion: `Stream<string>`
  - `Reactivity.stream(["crsql:dbVersion"], getDbVersion)`
- reactivePeerVersion(siteId: string): `Stream<{ version: string, seq: number } | null>`
  - `Reactivity.stream({ "crsql:peer": [siteId] }, getPeerVersion(siteId))`
- reactivePullChanges(since: string, excludeSites?: string[]): `Stream<ChangeRowSerialized[]>`
  - `Reactivity.stream(["crsql:changes"], pullChanges(since, excludeSites))`

These are read-only convenience wrappers around existing reads and the key scheme.

## Usage Guidance

Consumers can opt into Reactivity by providing `Reactivity.layer` and subscribing to Streams:

- Watch a table: `sql.reactive([table("todos")], sql\`SELECT * FROM todos\`)`
- Watch a row: `sql.reactive(row("todos", pkHex), sql\`SELECT * FROM todos WHERE pk_hex = ${pkHex}\`)`
- Watch db version: `CrSql.reactiveDbVersion`
- Watch peer version: `CrSql.reactivePeerVersion(siteId)`
- Watch exported changes: `CrSql.reactivePullChanges(since, excludes)`

For writes that bypass `CrSql.applyChanges` or `CrSql.setPeerVersion`, callers should perform explicit invalidation or route writes through an EventLog workflow that performs invalidation.

## Testing Plan

- reactiveDbVersion emits after `applyChanges`.
- reactivePullChanges re-emits after `applyChanges`.
- reactivePeerVersion emits after `setPeerVersion`.
- Provide `Reactivity.layer` in the test stack and use a test SqlClient (as in current tests).

## Documentation Tasks

- Update JSDoc in `CrSql.ts` with examples showing how to consume the reactive helpers.
- Document key helpers and when to use per-table vs. broad keys.

## Touchpoints in Code

- Define and export key helpers alongside the service.
- Wrap `applyChanges` and `setPeerVersion` using `Reactivity.mutation`.
- Add `reactive*` accessors on `CrSql`.
- Do not add unused imports: wire `Reactivity` only where used.

## References

- Reactivity service: `packages/experimental/src/Reactivity.ts`
- SQL client reactive integration: `packages/sql/src/internal/client.ts`, `packages/sql/src/SqlClient.ts`
- EventLog reactivity example: `packages/experimental/src/EventLog.ts`

## Future: Schema Migration (crsql_automigrate)

Add a first‑class wrapper for CR‑SQLite automigrations in the `CrSql` service.

- API shape (proposed):
  - `automigrate(schema: string): Effect<void, CrSqlErrors.CrSqliteExtensionMissing | SqlError>`
  - The `schema` is a SQL string (or concatenated SQL) describing tables and constraints to migrate.
- Implementation:
  - Ensure the extension is loaded (reuse existing service wiring).
  - Execute `SELECT crsql_automigrate(${schema})` via `SqlClient`.
  - No feature detection or soft fallbacks; fail fast on invalid input or missing extension.
- Tests:
  - Creates new CRR table(s) from an empty DB; verify presence via `sqlite_master` and `crsql_changes` activity after an insert.
  - Alters existing CRR schema (e.g., add a column) and verifies changes get captured post‑migration.
  - Idempotency: running the same schema twice is a no‑op and does not error.
  - Failure cases: invalid SQL causes explicit failure (assert precise error). No try/catch swallowing.
- Notes:
  - Keep migrations single‑connection scoped in tests to avoid `:memory:` identity drift.
  - Document expected schema string format with examples in `CrSql.ts` JSDoc when implementing.
