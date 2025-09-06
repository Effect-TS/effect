/**
 * CR-SQLite service for conflict-free replicated database operations.
 *
 * This module provides a high-level Effect service interface for working with CR-SQLite
 * (Conflict-free Replicated SQLite) databases. CR-SQLite enables multi-master replication
 * with automatic conflict resolution, allowing seamless data synchronization across
 * distributed systems without manual conflict handling.
 *
 * **Core Capabilities:**
 * - **Site Management**: Getting unique site identifiers and database versions
 * - **Change Synchronization**: Pulling and applying change sets between replicas
 * - **Peer Tracking**: Managing replication cursors for distributed peers
 * - **Schema Migration**: Automated schema evolution with crsql_automigrate
 * - **Fractional Indexing**: Ordered list support for collaborative editing
 *
 * **Multi-Master Replication**: All operations support CR-SQLite's CRDT (Conflict-free
 * Replicated Data Type) semantics, enabling partition-tolerant systems where multiple
 * replicas can accept writes independently and later converge to a consistent state.
 *
 * All operations are Effect-based for composable error handling, dependency injection,
 * and integration with the broader Effect ecosystem.
 *
 * **Security Note**: This module uses Effect SQL's tagged template literals,
 * which automatically handle parameterization and SQL injection protection.
 * The `${variable}` syntax is safe - Effect SQL converts these to proper
 * parameterized queries under the hood.
 *
 * @since 0.1.0
 */
// NOTE: avoid static import of libcrsql here to keep docgen example compilation
// simple (some TS runners disallow `import.meta` in dependency graphs). We
// dynamically import the path at runtime instead.
import * as SqlClient from "@effect/sql/SqlClient"
import * as SqlError from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as CrSqlErrors from "./CrSqlErrors.js"
import * as CrSqliteExtension from "./CrSqliteExtension.js"
import * as CrSqlSchema from "./CrSqlSchema.js"
import type * as SqliteClient from "./SqliteClient.js"

// TODO(effect-native): Reactivity integration
// - Define and export key helpers (dbVersion, changes, table, row, peer)
// - Add reactive accessors (reactiveDbVersion, reactivePeerVersion, reactivePullChanges)
// - Wrap mutations with Reactivity.mutation and invalidate precise keys
// See packages-native/crsql/TODO.md (Key Scheme, Key Helper Builders, Reactive Accessors, Mutation Wiring)

const makeCrSql = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  const { sha } = yield* CrSqliteExtension.ExtInfoLoaded
  if (!sha) return yield* new CrSqlErrors.CrSqliteExtensionMissing({ cause: "crsql extension SHA missing" })

  // NOTE: finalizer runs only after closing the current scope, after this instance of crsql has been disposed
  yield* Effect.addFinalizer(() => crsql.finalize.pipe(Effect.ignoreLogged))

  const getSiteIdHex = sql<{ site_id: CrSqlSchema.SiteIdHex }>`SELECT hex(crsql_site_id()) AS site_id`.pipe(
    Effect.flatMap((rows) =>
      rows.length > 0
        ? Effect.succeed(rows[0].site_id)
        : Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause: "crsql_site_id() returned no rows" }))
    ),
    Effect.withSpan("CrSql.getSiteIdHex")
  )

  const getDbVersion = sql<{ version: CrSqlSchema.VersionString }>`SELECT CAST(crsql_db_version() AS TEXT) AS version`
    .pipe(
      Effect.flatMap((rows) =>
        rows.length > 0
          ? Effect.succeed(rows[0].version)
          : Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause: "crsql_db_version() returned no rows" }))
      ),
      Effect.withSpan("CrSql.getDbVersion")
    )

  const getNextDbVersion = sql<{ v: CrSqlSchema.VersionString }>`SELECT CAST(crsql_next_db_version() AS TEXT) AS v`
    .pipe(
      Effect.flatMap((rows) =>
        rows.length > 0
          ? Effect.succeed(rows[0].v)
          : Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause: "crsql_next_db_version() returned no rows" }))
      ),
      Effect.withSpan("CrSql.getNextDbVersion")
    )

  const getRowsImpacted = sql<{ n: number }>`SELECT crsql_rows_impacted() AS n`.pipe(
    Effect.flatMap((rows) =>
      rows.length > 0
        ? Effect.succeed(rows[0].n)
        : Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause: "crsql_rows_impacted() returned no rows" }))
    ),
    Effect.withSpan("CrSql.getRowsImpacted")
  )

  const pullChanges = Effect.fn("@effect-native/crsql/CrSql#pullChanges")(function* pullChanges(
    since: CrSqlSchema.VersionString = "0",
    excludeSites?: ReadonlyArray<CrSqlSchema.SiteIdHex>
  ) {
    if (excludeSites?.length) {
      return yield* sql<CrSqlSchema.ChangeRowSerialized>`
        SELECT
          "table",
          hex(pk) as pk,
          cid,
          CASE
            WHEN val IS NULL THEN NULL
            WHEN typeof(val) = 'blob' THEN hex(val)
            ELSE val
          END as val,
          typeof(val) as val_type,
          CAST(col_version AS TEXT) as col_version,
          CAST(db_version AS TEXT) as db_version,
          hex(site_id) as site_id,
          cl,
          seq
        FROM crsql_changes
        WHERE db_version > CAST(${since} AS INTEGER)
          AND hex(site_id) NOT IN (${sql.in(excludeSites)})
        ORDER BY db_version, seq
      `
    }
    return yield* sql<CrSqlSchema.ChangeRowSerialized>`
      SELECT
        "table",
        hex(pk) as pk,
        cid,
        CASE
          WHEN val IS NULL THEN NULL
          WHEN typeof(val) = 'blob' THEN hex(val)
          ELSE val
        END as val,
        typeof(val) as val_type,
        CAST(col_version AS TEXT) as col_version,
        CAST(db_version AS TEXT) as db_version,
        hex(site_id) as site_id,
        cl,
        seq
      FROM crsql_changes
      WHERE db_version > CAST(${since} AS INTEGER)
      ORDER BY db_version, seq
    `
  })

  // TODO(effect-native): Add reactive Stream accessors
  // - reactiveDbVersion: Reactivity.stream(["crsql:dbVersion"], getDbVersion)
  // - reactivePeerVersion(siteId): Reactivity.stream({ "crsql:peer": [siteId] }, getPeerVersion(siteId))
  // - reactivePullChanges(since, excludes): Reactivity.stream(["crsql:changes"], pullChanges(since, excludes))
  // See packages-native/crsql/TODO.md#reactive-accessors

  const finalize = Effect.fn("@effect-native/crsql/CrSql#finalize")(function* finalize() {
    yield* sql`SELECT crsql_finalize();`.pipe(
      Effect.catchAll((cause) => Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause })))
    )
  })()

  const asCrr = Effect.fn("@effect-native/crsql/CrSql#asCrr")(function* asCrr(tableName: string) {
    // Idempotent: crsql_as_crr ignores if already a CRR
    yield* sql`SELECT crsql_as_crr(${tableName})`
  })

  const asTable = Effect.fn("@effect-native/crsql/CrSql#asTable")(function* asTable(tableName: string) {
    yield* sql`SELECT crsql_as_table(${tableName})`
  })

  const beginAlter = Effect.fn("@effect-native/crsql/CrSql#beginAlter")(function* beginAlter(tableName: string) {
    yield* sql`SELECT crsql_begin_alter(${tableName})`
  })

  const commitAlter = Effect.fn("@effect-native/crsql/CrSql#commitAlter")(function* commitAlter(tableName: string) {
    yield* sql`SELECT crsql_commit_alter(${tableName})`
  })

  const getSha = sql<{ sha: string }>`SELECT crsql_sha() as sha`.pipe(
    Effect.map((rows) => rows[0].sha),
    Effect.withSpan("CrSql.getSha")
  )

  /**
   * Apply schema changes using CR-SQLite's automigration engine.
   *
   * This is exposed as a flexible tagged template or a plain-string function:
   *
   * - Template: `yield* crsql.automigrate`...schema...``
   * - String:   `yield* crsql.automigrate(schema)`
   *
   * The provided SQL should describe the desired schema using normal SQLite DDL
   * (e.g. `CREATE TABLE IF NOT EXISTS ...`, index definitions) plus any
   * CR-SQLite setup statements you want re-applied after structural changes
   * (e.g. `SELECT crsql_as_crr('table')`, `SELECT crsql_fract_as_ordered(...)`).
   *
   * Under the hood, crsql_automigrate performs the following (per upstream):
   * - Creates a temporary in-memory database and executes your schema after
   *   stripping CRR-specific statements (e.g., `crsql_as_crr`, `crsql_fract_as_ordered`).
   * - Diffs the temp DB against the current database and applies structural
   *   changes inside a savepoint:
   *   - Drops tables that no longer exist in the new schema
   *   - Adds or drops columns as needed (NOTE: adding primary key columns is
   *     not supported and will fail)
   *   - Updates non-PK indices to match the new schema (drops/recreates when needed)
   *   - For CRR tables, wraps structural changes in `crsql_begin_alter` /
   *     `crsql_commit_alter` to safely manage triggers
   * - Finally, executes your original schema string on the local DB so CRR
   *   statements and other declarative conveniences are (re)applied.
   *
   * Guidance and limitations:
   * - Use `CREATE TABLE IF NOT EXISTS` (and similar idempotent DDL) in your
   *   schema so it can be applied repeatedly.
   * - Do not attempt to change primary key definitions using automigrate; use
   *   a manual migration for PK changes.
   * - Keep your own schema version/name in a metadata table (e.g.,
   *   `crsql_master`) and decide when to call `automigrate` vs. a first-time
   *   `exec` of the schema (the upstream js driver does this pattern).
   * - Some SQLite drivers cache table info aggressively; after automigrating,
   *   you may prefer to use a fresh connection or call `crsql.finalize` before
   *   continuing to avoid stale statement state. Our tests demonstrate both
   *   approaches.
   *
   * Errors:
   * - Fails fast with a SqlError when schema is invalid or a disallowed change
   *   (e.g., adding a PK column) is detected. No errors are swallowed.
   *
   * Examples
   * ```ts
   * // Initial apply
   * yield* crsql.automigrate`
   *   CREATE TABLE IF NOT EXISTS items (
   *     id BLOB PRIMARY KEY,
   *     name TEXT NOT NULL DEFAULT ''
   *   );
   *   SELECT crsql_as_crr('items');
   * `
   *
   * // Later migration: add a column
   * yield* crsql.automigrate`
   *   CREATE TABLE IF NOT EXISTS items (
   *     id BLOB PRIMARY KEY,
   *     name TEXT NOT NULL DEFAULT '',
   *     note TEXT NOT NULL DEFAULT ''
   *   );
   *   SELECT crsql_as_crr('items');
   * `
   * ```
   */
  const automigrate = Effect.fn("CrSql.automigrate")(
    (
      first: string | TemplateStringsArray,
      // TODO: add support for values other than string maybe someday
      ...values: ReadonlyArray<string>
    ) => {
      const schema = isTemplateStringsArray(first)
        ? String.raw(
          first,
          // TODO: add support for values other than string maybe someday
          ...values.map((it) => String(it))
        )
        : String(first)
      return sql`SELECT crsql_automigrate(${schema})`.pipe(Effect.asVoid)
    }
  )

  /**
   * Enable Fractional Indexing for ordered lists on a table.
   *
   * crsql_fract_as_ordered configures a table so that an order column is
   * maintained via an “infinite precision” fractional index. This allows:
   * - Appending/prepending via special sentinel values (1 = append, -1 = prepend)
   * - Generating keys between two neighbors without reindexing
   * - Conflict resolution for concurrent/offline inserts that target the same
   *   position; the index is guaranteed to converge
   *
   * References:
   * - Overview video: https://www.youtube.com/watch?v=BghFgK6VJIE
   * - Extension source: https://github.com/vlcn-io/cr-sqlite/tree/main/core/rs/fractindex-core/src
   * - Implementation uses a view named "{table}_fractindex" for ordered ops
   *
   * Notes:
   * - Minimal signature is provided here (table + order column). The upstream
   *   function also accepts additional columns that define the list scope (e.g.,
   *   list_id). A variadic helper that passes additional grouping columns can be
   *   added in a follow-up with a safe parameterization strategy.
   */
  const fractAsOrdered = Effect.fn("@effect-native/crsql/CrSql#fractAsOrdered")(function* fractAsOrdered(
    tableName: string,
    orderColumn: string
  ) {
    yield* sql`SELECT crsql_fract_as_ordered(${tableName}, ${orderColumn})`
  })

  /**
   * Variant of {@link fractAsOrdered} that accepts additional grouping columns
   * which define list partitions (e.g., list_id). All arguments are passed as
   * text parameters to `crsql_fract_as_ordered(table, order, ...groups)`.
   *
   * Example:
   * ```ts
   * yield* crsql.fractAsOrderedWith("items", "ord", ["list_id"]) // per-list ordering
   * ```
   */
  const fractAsOrderedWith = Effect.fn("@effect-native/crsql/CrSql#fractAsOrderedWith")(function* fractAsOrderedWith(
    tableName: string,
    orderColumn: string,
    groupColumns: ReadonlyArray<string>
  ) {
    const args = [tableName, orderColumn, ...groupColumns]
    const placeholders = Array.from({ length: args.length }, () => "?").join(", ")
    // Use a parameterized fragment to safely pass variadic arguments
    yield* sql`${Statement.unsafeFragment(`SELECT crsql_fract_as_ordered(${placeholders})`, args)}`
  })

  /**
   * Generate a fractional key between two existing order keys.
   *
   * Returns a stable string key that sorts between the two inputs when used in
   * the configured order column. Use this when inserting “between” neighbors or
   * during reordering operations.
   */
  const fractKeyBetween = Effect.fn("@effect-native/crsql/CrSql#fractKeyBetween")((key1: string, key2: string) =>
    sql<{ key: string }>`SELECT crsql_fract_key_between(${key1}, ${key2}) AS key`.pipe(
      Effect.map((rows) => rows[0].key),
      Effect.withSpan("CrSql.fractKeyBetween")
    )
  )

  // Product decision: rely on SQLite's unhex() (available in sqlite >= 3.50.2).
  // If unhex() is missing or disabled in the host, we fail fast with
  // UnhexUnavailable rather than adding feature-detection fallbacks.
  // NOTE: verifying unhex() presence as early as possible in layer creation
  // so that it'll be easier to know when there's a configuration issue
  yield* sql`SELECT hex(unhex('00')) as ok`.pipe(
    Effect.catchAll((cause) => Effect.fail(new CrSqlErrors.UnhexUnavailable({ cause })))
  )
  const applyChanges = Effect.fn("@effect-native/crsql/CrSql#applyChanges")(function* applyChanges(
    changes: ReadonlyArray<CrSqlSchema.ChangeRowSerialized> | ReadonlyArray<CrSqlSchema.ChangeArray>
  ) {
    // TODO(effect-native): Wrap with Reactivity.mutation and invalidate keys
    // - Invalidate ["crsql:dbVersion", "crsql:changes"] after successful apply
    // - Aggregate row-level invalidations by table: { ["crsql:row:" + table]: [pkHex...] }
    //   where pkHex is the hex string from change.pk
    // Implementation should keep Effect.withTransaction intact and only augment with Reactivity
    // See packages-native/crsql/TODO.md#mutation-wiring
    const APPLY_CONCURRENCY = 64 as const
    yield* sql.withTransaction(
      Effect.forEach(
        changes.map(CrSqlSchema.toChangeArray),
        // Product decision: use unhex() to decode transport hex into BLOBs
        // (pk, site_id, and val when val_type='blob'), instead of pushing this
        // responsibility into application code. Tests assume unhex() presence.
        ([table, pk, cid, val, val_type, col_version, db_version, site_id, cl, seq]) =>
          sql`
            INSERT INTO crsql_changes ("table", pk, cid, val, col_version, db_version, site_id, cl, seq)
            VALUES (
              ${table},
              unhex(${pk}),
              ${cid},
              CASE
                WHEN ${val_type} = 'null' THEN NULL
                WHEN ${val_type} = 'blob' THEN unhex(${val})
                ELSE ${val}
              END,
              CAST(${col_version} AS INTEGER),
              CAST(${db_version} AS INTEGER),
              unhex(${site_id}),
              ${cl},
              ${seq}
            )
          `,
        { concurrency: APPLY_CONCURRENCY, discard: true }
      )
    )
  })

  /**
   * Derive a SQLite schema (DDL) string from a set of CR‑SQLite change rows.
   *
   * The generated schema aims to be a safe minimum required to enable CRR on
   * the referenced tables and accept the provided changes:
   * - For each table present in the change set, emits a `CREATE TABLE IF NOT EXISTS` with
   *   a single `id BLOB PRIMARY KEY` column (assumes single‑column BLOB PKs, which
   *   is consistent with this project's usage and tests)
   * - Adds one column per observed `cid` (excluding `id`) with a type inferred from
   *   `val_type` across changes for that column. Supported mappings:
   *     - text -> TEXT
   *     - integer -> INTEGER
   *     - real -> REAL
   *     - blob -> BLOB
   *   If a column is only ever observed with `val_type = 'null'`, inference fails fast.
   *   If conflicting types are observed for the same column, inference fails fast.
   * - Appends `SELECT crsql_as_crr('<table>');` for each table
   *
   * Notes and limitations:
   * - This does not attempt to infer composite primary keys or constraints beyond types.
   *   It is intentionally conservative to keep failures visible and deterministic.
   * - Intended to be used with {@link automigrate}: `yield* crsql.automigrate(schema)`
   *
   * @param changes - exported change rows to analyze
   * @returns schema DDL suitable for crsql_automigrate
   */
  const __experimental__schemaFromChanges = Effect.fn("@effect-native/crsql/CrSql#schemaFromChanges")(
    function* schemaFromChanges(
      changes: ReadonlyArray<CrSqlSchema.ChangeRowSerialized>
    ) {
      type SqlType = "TEXT" | "INTEGER" | "REAL" | "BLOB"
      const mapType = (t: CrSqlSchema.ChangeRowSerialized["val_type"]): SqlType | null => {
        if (t === "null") return null
        const mapping: { readonly [K in Exclude<CrSqlSchema.SqlValueType, "null">]: SqlType } = {
          text: "TEXT",
          integer: "INTEGER",
          real: "REAL",
          blob: "BLOB"
        }
        return mapping[t]
      }

      // Collect per-table column type info from observed changes
      const byTable = new Map<string, Map<string, SqlType>>()
      for (const c of changes) {
        let cols = byTable.get(c.table)
        if (!cols) {
          cols = new Map()
          byTable.set(c.table, cols)
        }
        if (c.cid === "id") continue // we'll always declare `id` explicitly as PK first
        const observed = mapType(c.val_type)
        if (observed === null) {
          // Skip null here; we will validate after aggregation to ensure at least one non-null sample per column
          continue
        }
        const prev = cols.get(c.cid)
        if (prev && prev !== observed) {
          // Conflicting type inference for the same column => fail fast
          return yield* Effect.fail(
            new SqlError.SqlError({
              message: `Conflicting types for ${c.table}.${c.cid}: ${prev} vs ${observed}`,
              cause: undefined
            })
          )
        }
        cols.set(c.cid, observed)
      }

      // Validate columns that only had null observations (no concrete type seen)
      for (const [table, cols] of byTable) {
        for (const [cid, typ] of cols) {
          if (!typ) {
            return yield* Effect.fail(
              new SqlError.SqlError({
                message: `Unable to infer type for ${table}.${cid} (only null values observed)`,
                cause: undefined
              })
            )
          }
        }
      }

      // Build DDL
      const chunks: Array<string> = []
      const tables = Array.from(byTable.keys()).sort()
      for (const table of tables) {
        const cols = byTable.get(table)!
        // Deterministic order: id first, then other columns sorted by name
        const parts: Array<string> = ["id BLOB PRIMARY KEY"]
        const others = Array.from(cols.entries())
          .filter(([name]) => name !== "id")
          .sort((a, b) => a[0].localeCompare(b[0]))
        for (const [name, typ] of others) {
          parts.push(`${name} ${typ}`)
        }
        const create = `CREATE TABLE IF NOT EXISTS ${table} (\n  ${parts.join(",\n  ")}\n);`
        const asCrrStmt = `SELECT crsql_as_crr('${table}');`
        chunks.push(create, asCrrStmt)
      }

      return chunks.join("\n")
    }
  )

  const setPeerVersion = Effect.fn("@effect-native/crsql/CrSql#setPeerVersion")(function* setPeerVersion(
    props: {
      siteId: CrSqlSchema.SiteIdHex
      version: CrSqlSchema.VersionString
      seq: number
    }
  ) {
    // TODO(effect-native): Wrap with Reactivity.mutation to invalidate peer watchers
    // - Invalidate { "crsql:peer": [siteId] }
    // See packages-native/crsql/TODO.md#mutation-wiring
    // Product decision: compare/store peer site ids as BLOBs via unhex().
    yield* sql`
      INSERT OR REPLACE INTO crsql_tracked_peers (site_id, version, tag, event, seq)
      VALUES (unhex(${props.siteId}), CAST(${props.version} AS INTEGER), 0, 0, ${props.seq})
    `
  })

  // Product decision: rely on unhex() to compare stored BLOB site_id with
  // transport hex. Environments without unhex() should fail fast.
  const getPeerVersion = Effect.fn("@effect-native/crsql/CrSql#getPeerVersion")(function* getPeerVersion(
    siteId: CrSqlSchema.SiteIdHex
  ) {
    const [peerVersion] = yield* sql<{ version: CrSqlSchema.VersionString; seq: number }>`
      SELECT CAST(version AS TEXT) as version, seq
      FROM crsql_tracked_peers
      WHERE site_id = unhex(${siteId})
    `
    return peerVersion ?? null
  })

  const listTrackedPeers = sql<CrSqlSchema.TrackedPeerSerialized>`
    SELECT hex(site_id) AS site_id, CAST(version AS TEXT) AS version, seq
    FROM crsql_tracked_peers
  `.pipe(Effect.withSpan("CrSql.listTrackedPeers"))

  const trackedPeersMap = listTrackedPeers.pipe(
    Effect.map((rows) =>
      Object.fromEntries(
        rows.map((r) => [r.site_id, { version: r.version, seq: r.seq }])
      ) as Record<CrSqlSchema.SiteIdHex, { version: CrSqlSchema.VersionString; seq: number }>
    ),
    Effect.withSpan("CrSql.trackedPeersMap")
  )

  const crsql = {
    /**
     * Returns this database's CR‑SQLite site identifier as a 16‑byte hex string.
     *
     * Conceptually, the site ID is a stable replica identity persisted in the
     * database file by CR‑SQLite. It is used to:
     * - Disambiguate the origin of changes during synchronization
     * - Exclude local changes when pulling from remote peers
     *
     * Read via `hex(crsql_site_id())` to match the transport shape.
     *
     * @example
     * ```typescript
     * import * as CrSql from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const siteId = Effect.gen(function* () {
     *   return yield* CrSql.CrSql.getSiteIdHex
     * })
     * ```
     *
     * @since 0.1.0
     * @category Core Operations
     */
    getSiteIdHex,

    /**
     * Returns the current CR-SQLite database version as a base-10 string.
     *
     * The database version is a monotonically increasing logical clock maintained
     * by CR-SQLite that increments with each transaction containing changes to CRR
     * tables. This version serves as a global ordering mechanism across all replicas
     * and is essential for synchronization protocols.
     *
     * **Key Properties:**
     * - **Monotonic**: Always increases, never decreases within a database
     * - **Transaction-scoped**: Increments once per transaction, not per operation
     * - **Sync cursor**: Commonly used as the `since` parameter in {@link pullChanges}
     * - **Cross-replica**: Each replica maintains its own independent version counter
     *
     * The version is returned as a base-10 string (rather than number) to avoid
     * JavaScript's 53-bit integer precision limitations with large version numbers.
     *
     * @returns Effect yielding the current database version as a string
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const trackChanges = Effect.gen(function* () {
     *   const startVersion = yield* CrSql.CrSql.getDbVersion
     *
     *   // Perform some operations
     *   yield* sql`INSERT INTO todos VALUES (randomblob(16), 'New task')`
     *
     *   const endVersion = yield* CrSql.CrSql.getDbVersion
     *   console.log(`Version changed from ${startVersion} to ${endVersion}`)
     * })
     * ```
     *
     * @since 0.1.0
     * @category Core Operations
     * @see {@link pullChanges} - Uses version as synchronization cursor
     * @see {@link getNextDbVersion} - For transaction planning
     */
    getDbVersion,

    /**
     * Returns the database version that will be assigned to the next transaction.
     *
     * This function provides the version number that CR-SQLite will assign to
     * the next transaction containing changes to CRR tables. It's useful for
     * transaction planning, optimistic concurrency control, and debugging
     * version-related synchronization issues.
     *
     * **Use Cases:**
     * - Pre-computing version numbers for transaction batching
     * - Debugging version gaps in synchronization logs
     * - Optimistic concurrency control in application logic
     * - Planning change exports before applying transactions
     *
     * @returns Effect yielding the next database version as a string
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const planTransaction = Effect.gen(function* () {
     *   const currentVersion = yield* CrSql.CrSql.getDbVersion
     *   const nextVersion = yield* CrSql.CrSql.getNextDbVersion
     *
     *   console.log(`Current: ${currentVersion}, Next: ${nextVersion}`)
     *   // Output: "Current: 42, Next: 43"
     *
     *   // Apply transaction - version will become nextVersion
     *   yield* sql`INSERT INTO todos VALUES (randomblob(16), 'Planned task')`
     * })
     * ```
     *
     * @since 0.1.0
     * @category Core Operations
     * @see {@link getDbVersion} - For current version
     */
    getNextDbVersion,

    /**
     * Returns `crsql_rows_impacted()` for the most recent write.
     *
     * Useful for validating bulk operations and monitoring write volume as
     * tracked by CR-SQLite. Exact semantics are defined by the extension and
     * may include rows affected by triggers/metadata updates in addition to the
     * direct user-visible rows.
     *
     * @returns Effect yielding the number reported by `crsql_rows_impacted()`
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const bulkInsert = Effect.gen(function* () {
     *   yield* sql`INSERT INTO todos (id, text) VALUES
     *     (randomblob(16), 'Task 1'),
     *     (randomblob(16), 'Task 2'),
     *     (randomblob(16), 'Task 3')`
     *
     *   const impacted = yield* CrSql.CrSql.getRowsImpacted
     *   console.log(`Rows impacted (per CR-SQLite): ${impacted}`)
     * })
     * ```
     *
     * @since 0.1.0
     * @category Core Operations
     */
    getRowsImpacted,
    /**
     * Pulls CR‑SQLite change rows newer than a given version, optionally
     * excluding changes produced by specific sites.
     *
     * The result is in the pre‑serialized, wire‑ready shape:
     * - `pk` and `site_id` are hex strings (`hex(...)`)
     * - `val` is null, a hex string (when `val_type = 'blob'`), a string, or a
     *   number depending on SQLite's dynamic type
     * - `col_version` and `db_version` are bigint values encoded as base‑10 strings
     * - Results are ordered by `(db_version, seq)` for a deterministic total order
     *
     * @param since - lower bound (exclusive) for `db_version` (default "0")
     *                Safe from SQL injection via Effect SQL's automatic parameterization
     * @param excludeSites - optional list of site IDs (hex) to exclude
     *
     * The returned rows are in the exact serialized transport shape expected by
     * {@link applyChanges}.
     *
     * @example
     * ```typescript
     * import * as CrSql from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const changes = Effect.gen(function* () {
     *   const since = yield* CrSql.CrSql.getDbVersion
     *   const targetPeerSiteId = "A1B2C3D4E5F6789012345678ABCDEF90"
     *   return yield* CrSql.CrSql.pullChanges(since, [targetPeerSiteId])
     * })
     * ```
     *
     * @since 0.1.0
     * @category Synchronization
     */
    pullChanges,

    /**
     * Cleanly tears down CR-SQLite per-connection resources and prepared statements.
     *
     * CR-SQLite maintains internal prepared statements and caches that persist for
     * the lifetime of the database connection. This function explicitly cleans up
     * these resources by calling `crsql_finalize()`, ensuring proper resource
     * management when closing connections.
     *
     * **Why explicit cleanup is needed:**
     * - CR-SQLite registers persistent prepared statements when loaded
     * - Some host environments don't reliably trigger extension unload hooks
     * - Explicit finalization prevents resource leaks in long-running applications
     * - Required for clean connection lifecycle management
     *
     * **Safety Properties:**
     * - **Idempotent**: Safe to call multiple times without error
     * - **Non-blocking**: Doesn't interfere with ongoing operations
     * - **Resource-only**: Only affects internal CR-SQLite resources, not user data
     *
     * This function is automatically called via Effect finalizers when using the
     * CrSql service, but can also be called explicitly for manual resource management.
     *
     * @returns Effect that completes when CR-SQLite resources have been cleaned up
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const cleanupConnection = Effect.gen(function* () {
     *   // Do work with CR-SQLite
     *   yield* CrSql.CrSql.asCrr("todos")
     *   yield* sql`INSERT INTO todos VALUES (randomblob(16), 'Final task')`
     *
     *   // Explicitly clean up before closing connection
     *   yield* CrSql.CrSql.finalize
     *   // Now safe to close the underlying SQLite connection
     * })
     * ```
     *
     * @since 0.1.0
     * @category Resource Management
     * @see https://sqlite.org/forum/forumpost/c94f943821 - SQLite extension lifecycle discussion
     */
    finalize,

    /**
     * Applies a batch of CR-SQLite change rows in a single atomic transaction.
     *
     * This is the inverse operation of {@link pullChanges} — it takes serialized
     * change rows produced by another replica and applies them to the local
     * database. CR-SQLite handles conflict resolution (CRDT semantics) so all
     * replicas converge.
     *
     * **Transaction Safety:**
     * - Applies all changes inside one transaction (atomic)
     * - Rolls back the entire batch on the first failure
     * - Safe to re-apply the same batch (idempotent at the CRR level)
     *
     * **Change Processing:**
     * - Decodes hex-encoded BLOBs via SQLite `unhex()`
     * - Reconstructs values using the provided `val_type`
     * - Expects changes to be pre-ordered by `(db_version, seq)`; order is not
     *   enforced here beyond the provided input
     * - Updates local database state per CR-SQLite rules (this function does not
     *   update your `crsql_tracked_peers` table; call {@link setPeerVersion}
     *   yourself after a successful apply)
     *
     * **Conflict Resolution:**
     * CR-SQLite resolves write conflicts using its internal versioning and
     * column-level metadata, ensuring deterministic convergence across replicas.
     *
     * @param changes - Array of pre-serialized change rows to apply (from a peer).
     *   Accepts either object-shaped rows (`ChangeRowSerialized[]`) or tuple-shaped rows
     *   (`ChangeArray[]`).
     * @returns Effect that completes when all changes have been successfully applied
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     * @throws {UnhexUnavailable} When SQLite lacks the unhex() function
     * @throws {SqlError} When change application fails (e.g., constraint violations)
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const syncFromPeer = Effect.gen(function* () {
     *   // Pull changes from a remote peer (not this DB)
     *   const peerChanges = yield* peerCrSql.pullChanges("0")
     *
     *   // Apply them locally with automatic conflict resolution
     *   yield* localCrSql.applyChanges(peerChanges)
     *
     *   console.log(`Applied ${peerChanges.length} changes from peer`)
     * })
     * ```
     *
     * @since 0.1.0
     * @category Synchronization
     * @see {@link pullChanges} - For exporting changes from a replica
     */
    applyChanges,
    /**
     * Converts an existing SQLite table into a Conflict-free Replicated Relation (CRR).
     *
     * This operation upgrades a standard SQLite table to support CR-SQLite's multi-master
     * replication by adding the necessary metadata columns and triggers for change tracking.
     * Once converted, the table participates in the distributed replication system and
     * can synchronize changes with other replicas.
     *
     * The operation is **idempotent** - calling it on a table that's already a CRR
     * will not cause errors or duplicate setup.
     *
     * **What happens during conversion:**
     * - Adds `__crsql_*` metadata columns for version vectors and causality tracking
     * - Installs triggers to capture INSERT, UPDATE, DELETE operations
     * - Enables the table to appear in the `crsql_changes` virtual table
     * - Preserves all existing data and table structure
     *
     * @param tableName - Name of the SQLite table to convert to a CRR
     * @returns Effect that completes when the table has been successfully converted
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     * @throws {SqlError} When the table doesn't exist or conversion fails
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const program = Effect.gen(function* () {
     *   // First create a regular SQLite table
     *   yield* sql`CREATE TABLE todos (id BLOB PRIMARY KEY, text TEXT NOT NULL)`
     *
     *   // Convert it to a CRR for replication
     *   yield* CrSql.CrSql.asCrr("todos")
     *
     *   // Now inserts/updates will be tracked for sync
     *   yield* sql`INSERT INTO todos VALUES (randomblob(16), 'Hello World')`
     * })
     * ```
     *
     * @since 0.1.0
     * @category Schema Operations
     */
    asCrr,

    /**
     * Downgrades a Conflict-free Replicated Relation (CRR) back to a standard SQLite table.
     *
     * This operation removes CR-SQLite's replication infrastructure from a table,
     * converting it back to a regular SQLite table. This is typically used when
     * you no longer need replication for a particular table or during schema cleanup.
     *
     * **What happens during downgrade:**
     * - Removes `__crsql_*` metadata columns
     * - Drops change-tracking triggers
     * - Removes the table from the `crsql_changes` virtual table
     * - Preserves all user data in the original table structure
     * - **Warning**: Any pending changes for sync will be lost
     *
     * @param tableName - Name of the CRR table to downgrade to a standard table
     * @returns Effect that completes when the table has been successfully downgraded
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     * @throws {SqlError} When the table doesn't exist or is not a CRR
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const program = Effect.gen(function* () {
     *   // Downgrade a CRR back to regular table
     *   yield* CrSql.CrSql.asTable("todos")
     *
     *   // Table is now a standard SQLite table (no replication)
     *   // All user data remains intact
     * })
     * ```
     *
     * @since 0.1.0
     * @category Schema Operations
     */
    asTable,

    /**
     * Prepares a Conflict-free Replicated Relation (CRR) for safe schema modification.
     *
     * This function temporarily disables CR-SQLite's change-tracking triggers on the
     * specified table, allowing you to modify the table schema (add/drop columns, etc.)
     * without interfering with the replication infrastructure. Must be paired with
     * {@link commitAlter} to re-enable tracking after modifications.
     *
     * **Use Case**: When you need to `ALTER TABLE` on a CRR, the standard approach
     * would break CR-SQLite's metadata consistency. This function provides a safe
     * way to make schema changes while preserving replication capability.
     *
     * **Process:**
     * 1. Call `beginAlter(tableName)` - disables triggers
     * 2. Perform your `ALTER TABLE` statements
     * 3. Call `commitAlter(tableName)` - re-enables triggers and updates metadata
     *
     * @param tableName - Name of the CRR table to prepare for schema modification
     * @returns Effect that completes when the table is ready for alteration
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     * @throws {SqlError} When the table doesn't exist or is not a CRR
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const addColumnSafely = Effect.gen(function* () {
     *   // Prepare for schema change
     *   yield* CrSql.CrSql.beginAlter("todos")
     *
     *   // Now safe to alter the table
     *   yield* sql`ALTER TABLE todos ADD COLUMN priority INTEGER DEFAULT 0`
     *
     *   // Re-enable replication tracking
     *   yield* CrSql.CrSql.commitAlter("todos")
     * })
     * ```
     *
     * @since 0.1.0
     * @category Schema Operations
     * @see {@link commitAlter} - Must be called after schema modifications
     */
    beginAlter,

    /**
     * Finalizes schema modifications on a Conflict-free Replicated Relation (CRR).
     *
     * Re-enables CR-SQLite's change-tracking infrastructure after schema changes
     * made since {@link beginAlter} and updates internal bookkeeping to reflect
     * the modified table structure.
     *
     * @param tableName - Name of the CRR table to finalize schema modifications for
     * @returns Effect that completes when replication tracking has been restored
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     * @throws {SqlError} When the table schema is invalid or restoration fails
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const addColumnSafely = Effect.gen(function* () {
     *   yield* CrSql.CrSql.beginAlter("todos")
     *   yield* sql`ALTER TABLE todos ADD COLUMN priority INTEGER DEFAULT 0`
     *
     *   // Finalize the alteration - triggers are now updated
     *   yield* CrSql.CrSql.commitAlter("todos")
     * })
     * ```
     *
     * @since 0.1.0
     * @category Schema Operations
     * @see {@link beginAlter} - Must be called before schema modifications
     */
    commitAlter,

    /**
     * Retrieves the Git commit SHA of the loaded CR-SQLite extension.
     *
     * This function returns the build version identifier of the CR-SQLite extension
     * currently loaded in the database connection. The SHA corresponds to the specific
     * Git commit from which the extension was built, providing precise version tracking
     * for debugging, compatibility checks, and system diagnostics.
     *
     * **Use Cases:**
     * - Version compatibility verification between replicas
     * - Debugging and support ticket information
     * - Build reproducibility and audit trails
     * - Ensuring consistent CR-SQLite versions across distributed systems
     *
     * @returns Effect yielding the Git commit SHA as a hex string
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const checkVersion = Effect.gen(function* () {
     *   const sha = yield* CrSql.CrSql.getSha
     *   console.log(`CR-SQLite version: ${sha}`)
     *   // Output: "CR-SQLite version: a1b2c3d4e5f6..."
     * })
     * ```
     *
     * @since 0.1.0
     * @category Diagnostics
     */
    getSha,

    /**
     * Enables fractional indexing for ordered lists on a CRR table.
     *
     * Fractional indexing provides "infinite precision" ordering for list-like data
     * structures, enabling conflict-free collaborative editing scenarios. This is
     * particularly useful for applications like collaborative documents, task lists,
     * or any ordered data that multiple users might reorder simultaneously.
     *
     * **How it works:**
     * - Maintains stable ordering using fractional positions between items
     * - Supports append (position = 1) and prepend (position = -1) operations
     * - Automatically generates intermediate positions during concurrent inserts
     * - Converges to consistent ordering across all replicas
     *
     * **Generated infrastructure:**
     * - Creates a view named `{tableName}_fractindex` for ordered operations
     * - Enables position queries with `ORDER BY {orderColumn}`
     * - Supports position generation with {@link fractKeyBetween}
     *
     * @param tableName - Name of the CRR table to enable fractional indexing on
     * @param orderColumn - Column name to use for storing fractional order positions
     * @returns Effect that completes when fractional indexing is configured
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     * @throws {SqlError} When the table doesn't exist or configuration fails
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const setupOrderedTodos = Effect.gen(function* () {
     *   // Create and configure table for ordering
     *   yield* sql`CREATE TABLE todos (id BLOB PRIMARY KEY, text TEXT, ord TEXT DEFAULT '')`
     *   yield* CrSql.CrSql.asCrr("todos")
     *   yield* CrSql.CrSql.fractAsOrdered("todos", "ord")
     *
     *   // Use sentinel values for append/prepend
     *   yield* sql`INSERT INTO todos (id, text, ord) VALUES (randomblob(16), 'First', -1)`  // prepend
     *   yield* sql`INSERT INTO todos (id, text, ord) VALUES (randomblob(16), 'Last', 1)`   // append
     *
     *   // Query in order
     *   const ordered = yield* sql`SELECT text FROM todos ORDER BY ord`
     * })
     * ```
     *
     * @since 0.1.0
     * @category Fractional Indexing
     * @see {@link fractAsOrderedWith} - For lists partitioned by grouping columns
     * @see {@link fractKeyBetween} - For generating positions between existing items
     */
    fractAsOrdered,

    /**
     * Enables fractional indexing with grouping columns for partitioned ordered lists.
     *
     * This variant of {@link fractAsOrdered} supports partitioned ordering where
     * multiple independent ordered lists exist within the same table, distinguished
     * by grouping columns (e.g., `list_id`, `project_id`, etc.). Each partition
     * maintains its own independent ordering.
     *
     * **Common use cases:**
     * - Tasks ordered within different projects
     * - Messages ordered within different chat channels
     * - Items ordered within different shopping lists
     * - Comments ordered within different discussions
     *
     * @param tableName - Name of the CRR table to enable fractional indexing on
     * @param orderColumn - Column name to use for storing fractional order positions
     * @param groupColumns - Array of column names that define list partitions
     * @returns Effect that completes when partitioned fractional indexing is configured
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     * @throws {SqlError} When the table doesn't exist or configuration fails
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const setupProjectTasks = Effect.gen(function* () {
     *   yield* sql`CREATE TABLE tasks (
     *     id BLOB PRIMARY KEY,
     *     project_id TEXT NOT NULL,
     *     text TEXT,
     *     ord TEXT DEFAULT ''
     *   )`
     *   yield* CrSql.CrSql.asCrr("tasks")
     *
     *   // Enable per-project ordering
     *   yield* CrSql.CrSql.fractAsOrderedWith("tasks", "ord", ["project_id"])
     *
     *   // Each project has independent ordering
     *   yield* sql`INSERT INTO tasks VALUES (randomblob(16), 'proj-a', 'Task A1', -1)`
     *   yield* sql`INSERT INTO tasks VALUES (randomblob(16), 'proj-b', 'Task B1', -1)`
     * })
     * ```
     *
     * @since 0.1.0
     * @category Fractional Indexing
     * @see {@link fractAsOrdered} - For simple (non-partitioned) ordered lists
     */
    fractAsOrderedWith,

    /**
     * Generates a fractional order key between two existing positions.
     *
     * This function computes a new fractional position that sorts lexicographically
     * between two given order keys. The result can be used to insert items "between"
     * existing items in a fractionally-indexed list without requiring a full reorder
     * of other items.
     *
     * **Key properties:**
     * - Result always sorts between the input keys: `key1 < result < key2`
     * - Stable across replicas (deterministic generation)
     * - Efficient - no need to update other items' positions
     * - Supports arbitrarily fine positioning resolution
     *
     * **Use Cases:**
     * - Drag-and-drop reordering in collaborative interfaces
     * - Inserting items at specific positions in ordered lists
     * - Maintaining sort order during concurrent edits
     *
     * @param key1 - The fractional order key of the item that should come before
     * @param key2 - The fractional order key of the item that should come after
     * @returns Effect yielding a new fractional key that sorts between key1 and key2
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     * @throws {SqlError} When key generation fails (e.g., identical input keys)
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const insertBetween = Effect.gen(function* () {
     *   // Get existing items in order
     *   const items = yield* sql`SELECT id, ord FROM todos ORDER BY ord LIMIT 2`
     *   const [first, second] = items
     *
     *   // Generate position between them
     *   const betweenKey = yield* CrSql.CrSql.fractKeyBetween(first.ord, second.ord)
     *
     *   // Insert new item at the computed position
     *   yield* sql`INSERT INTO todos (id, text, ord) VALUES (
     *     randomblob(16), 'Middle item', ${betweenKey}
     *   )`
     * })
     * ```
     *
     * @since 0.1.0
     * @category Fractional Indexing
     * @see {@link fractAsOrdered} - Required setup for fractional indexing
     */
    fractKeyBetween,

    /**
     * **EXPERIMENTAL**: Derives a SQLite schema DDL from CR-SQLite change rows.
     *
     * This experimental function analyzes exported change rows and generates the minimal
     * SQLite schema (DDL) required to recreate the tables and enable CRR functionality
     * on a fresh database. It's designed for schema inference and migration scenarios.
     *
     * **⚠️ Experimental Status**: This API may change in future versions. Use with
     * caution in production systems and expect potential breaking changes.
     *
     * **Schema Generation Logic:**
     * - Creates `CREATE TABLE IF NOT EXISTS` statements for each referenced table
     * - Assumes single-column `id BLOB PRIMARY KEY` (consistent with project patterns)
     * - Infers column types from `val_type` observations across changes:
     *   - `text` → `TEXT`, `integer` → `INTEGER`, `real` → `REAL`, `blob` → `BLOB`
     * - Appends `SELECT crsql_as_crr('table');` statements to enable replication
     * - Orders columns deterministically (`id` first, others alphabetically)
     *
     * **Limitations:**
     * - Does not infer composite primary keys or complex constraints
     * - Fails fast on conflicting type observations for the same column
     * - Conservative approach prioritizes deterministic failures over smart inference
     *
     * @param changes - Array of serialized change rows to analyze for schema inference
     * @returns Effect yielding DDL string suitable for {@link automigrate}
     * @throws {SqlError} When type inference fails or conflicting schemas detected
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const recreateFromChanges = Effect.gen(function* () {
     *   // Get changes from a source database
     *   const changes = yield* sourceCrSql.pullChanges("0")
     *
     *   // Generate schema DDL
     *   const schema = yield* CrSql.CrSql.__experimental__schemaFromChanges(changes)
     *
     *   // Apply to fresh database
     *   yield* targetCrSql.automigrate(schema)
     *   yield* targetCrSql.applyChanges(changes)
     * })
     * ```
     *
     * @since 0.1.0
     * @category Experimental
     * @see {@link automigrate} - For applying the generated schema
     */
    __experimental__schemaFromChanges,

    /**
     * Applies schema changes using CR-SQLite's automated migration engine.
     *
     * This function provides a declarative approach to schema evolution by describing
     * your desired end-state schema and letting CR-SQLite automatically compute and
     * apply the necessary migrations. It supports both tagged template literals and
     * plain string schemas.
     *
     * **Migration Process** (performed by upstream CR-SQLite):
     * 1. **Schema Analysis**: Creates temporary database with target schema
     * 2. **Diff Computation**: Compares current vs target schema structures
     * 3. **Safe Migration**: Applies changes within savepoints with rollback safety
     * 4. **CRR Preservation**: Wraps CRR table changes in `begin_alter/commit_alter`
     * 5. **Declarative Reapplication**: Executes full schema to ensure consistency
     *
     * **Supported Operations:**
     * - Create/drop tables and indexes
     * - Add/drop columns (⚠️ **not** primary key columns)
     * - Modify constraints and defaults
     * - Reapply CRR configuration and fractional indexing setup
     *
     * @param schema - SQL DDL describing the desired schema state. Can be provided as
     *   tagged template literal or plain string. Should use idempotent statements
     *   like `CREATE TABLE IF NOT EXISTS` for repeatability.
     * @returns Effect that completes when schema migration has been applied
     * @throws {SqlError} When schema is invalid or contains unsupported changes
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     *
     * @example Tagged template usage:
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const migrateSchema = Effect.gen(function* () {
     *   yield* CrSql.CrSql.automigrate`
     *     CREATE TABLE IF NOT EXISTS todos (
     *       id BLOB PRIMARY KEY,
     *       text TEXT NOT NULL DEFAULT '',
     *       completed INTEGER NOT NULL DEFAULT 0,
     *       priority INTEGER NOT NULL DEFAULT 0  -- new column
     *     );
     *     SELECT crsql_as_crr('todos');
     *     SELECT crsql_fract_as_ordered('todos', 'ord');
     *   `
     * })
     * ```
     *
     * @example String usage:
     * ```typescript
     * const schema = `
     *   CREATE TABLE IF NOT EXISTS projects (
     *     id BLOB PRIMARY KEY,
     *     name TEXT NOT NULL DEFAULT ''
     *   );
     *   SELECT crsql_as_crr('projects');
     * `
     * yield* CrSql.CrSql.automigrate(schema)
     * ```
     *
     * @since 0.1.0
     * @category Schema Operations
     * @see https://github.com/vlcn-io/cr-sqlite - CR-SQLite automigrate documentation
     */
    automigrate,
    /**
     * Sets or updates the synchronization cursor for a peer replica in the tracking table.
     *
     * This function maintains per-peer synchronization state in CR-SQLite's
     * `crsql_tracked_peers` table, enabling efficient incremental synchronization
     * by tracking the last-seen version from each replica. This is essential
     * for pull-based synchronization protocols where each replica needs to know
     * what changes it has already received from its peers.
     *
     * **Synchronization Protocol Usage:**
     * 1. After successfully applying changes from a peer, update their cursor
     * 2. Use the stored cursor as the `since` parameter for the next pull
     * 3. This ensures incremental sync and avoids re-processing old changes
     * 4. Supports efficient multi-peer synchronization topologies
     *
     * **Storage Details:**
     * - Site IDs are stored as binary BLOBs (converted from hex via `unhex()`)
     * - Versions are stored as 64-bit integers for efficient range queries
     * - Sequence numbers provide within-version ordering for deterministic sync
     * - Uses `INSERT OR REPLACE` for idempotent cursor updates
     *
     * @param props - Peer tracking information
     * @param props.siteId - Hex-encoded site identifier of the peer replica (32 characters)
     * @param props.version - Database version last received from this peer (base-10 string)
     * @param props.seq - Sequence number within the version for ordered processing
     * @returns Effect that completes when the peer cursor has been updated
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     * @throws {UnhexUnavailable} When SQLite lacks the unhex() function
     * @throws {SqlError} When the update operation fails
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const syncWithPeer = Effect.gen(function* () {
     *   const peerSiteId = "A1B2C3D4E5F6789012345678ABCDEF90"
     *
     *   // Get last known position for this peer
     *   const cursor = yield* CrSql.CrSql.getPeerVersion(peerSiteId)
     *   const since = cursor?.version ?? "0"
     *
     *   // Pull new changes from peer
     *   const changes = yield* peerDb.pullChanges(since, [ourSiteId])
     *
     *   if (changes.length > 0) {
     *     // Apply changes locally
     *     yield* CrSql.CrSql.applyChanges(changes)
     *
     *     // Update cursor to highest version received
     *     const maxVersion = Math.max(...changes.map(c => parseInt(c.db_version)))
     *     yield* CrSql.CrSql.setPeerVersion({
     *       siteId: peerSiteId,
     *       version: maxVersion.toString(),
     *       seq: 0
     *     })
     *   }
     * })
     * ```
     *
     * @since 0.1.0
     * @category Peer Tracking
     * @see {@link getPeerVersion} - For retrieving stored peer cursors
     * @see {@link pullChanges} - Uses peer cursors for incremental sync
     */
    setPeerVersion,

    /**
     * Retrieves the synchronization cursor for a peer replica from the tracking table.
     *
     * This function reads the last-known synchronization state for a specific peer
     * from CR-SQLite's `crsql_tracked_peers` table. The returned cursor indicates
     * the highest database version that has been successfully received and applied
     * from that peer, enabling efficient incremental synchronization.
     *
     * **Return Value:**
     * - Returns `null` if no tracking record exists for the peer (first sync)
     * - Returns `{ version: string, seq: number }` for tracked peers
     * - Version is a base-10 string to avoid JavaScript precision limitations
     * - Sequence provides within-version ordering for deterministic processing
     *
     * **Usage in Sync Protocols:**
     * - Use the returned version as the `since` parameter for {@link pullChanges}
     * - Handle `null` by using "0" as the initial sync cursor
     * - Update the cursor via {@link setPeerVersion} after successful application
     *
     * @param siteId - Hex-encoded site identifier of the peer replica to look up
     * @returns Effect yielding the peer's cursor information, or null if not tracked
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     * @throws {UnhexUnavailable} When SQLite lacks the unhex() function
     * @throws {SqlError} When the query operation fails
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const getIncrementalChanges = Effect.gen(function* () {
     *   const peerSiteId = "B2C3D4E5F6A1789012345678ABCDEF01"
     *
     *   // Check what we last received from this peer
     *   const peerCursor = yield* CrSql.CrSql.getPeerVersion(peerSiteId)
     *
     *   if (peerCursor === null) {
     *     console.log("First sync with this peer - pulling all changes")
     *     return yield* peerDb.pullChanges("0")
     *   } else {
     *     console.log(`Last sync at version ${peerCursor.version}, seq ${peerCursor.seq}`)
     *     return yield* peerDb.pullChanges(peerCursor.version)
     *   }
     * })
     * ```
     *
     * @since 0.1.0
     * @category Peer Tracking
     * @see {@link setPeerVersion} - For updating peer cursors after sync
     * @see {@link listTrackedPeers} - For getting all tracked peer information
     */
    getPeerVersion,

    /**
     * Lists all tracked peer replicas and their synchronization cursors.
     *
     * This function returns a complete list of all peer replicas that have been
     * tracked in the local `crsql_tracked_peers` table, along with their current
     * synchronization cursors. This is useful for monitoring synchronization
     * health, debugging sync issues, and implementing multi-peer coordination.
     *
     * **Use Cases:**
     * - Health monitoring: detect peers that haven't synced recently
     * - Debugging: analyze sync patterns and identify stale cursors
     * - Coordination: implement mesh topology or hub-and-spoke patterns
     * - Cleanup: identify and remove obsolete peer tracking entries
     *
     * @returns Effect yielding an array of all tracked peer information
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const auditPeerSync = Effect.gen(function* () {
     *   const peers = yield* CrSql.CrSql.listTrackedPeers
     *
     *   console.log(`Tracking ${peers.length} peer replicas:`)
     *   for (const peer of peers) {
     *     console.log(`  ${peer.site_id}: version ${peer.version}, seq ${peer.seq}`)
     *   }
     * })
     * ```
     *
     * @since 0.1.0
     * @category Peer Tracking
     * @see {@link trackedPeersMap} - For map-based access to peer cursors
     */
    listTrackedPeers,

    /**
     * Returns tracked peer information as a keyed map for efficient lookups.
     *
     * This function provides the same peer tracking data as {@link listTrackedPeers}
     * but structured as a map keyed by site ID for O(1) access. Use it to look up
     * the last-seen cursor for a specific remote replica before fetching that
     * replica's changes.
     *
     * Important: This accessor only reads the local tracking table. It does not
     * fetch changes or apply them. In a sync loop, you typically:
     * 1) read the cursor from this map,
     * 2) fetch changes from the remote peer using that cursor,
     * 3) apply those remote changes locally,
     * 4) then record the new cursor via {@link setPeerVersion}.
     *
     * **Map Structure:**
     * - Keys: Hex-encoded site IDs (32-character strings)
     * - Values: `{ version: string, seq: number }` cursor objects
     *
     * @returns Effect yielding a map of site IDs to cursor information
     * @throws {CrSqliteExtensionMissing} When the CR-SQLite extension is not loaded
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const bulkSync = Effect.gen(function* () {
     *   const peerMap = yield* CrSql.CrSql.trackedPeersMap
     *   const ourSiteId = yield* CrSql.CrSql.getSiteIdHex
     *   const knownPeers = ["<peerA-site-hex>", "<peerB-site-hex>"]
     *
     *   for (const peerId of knownPeers) {
     *     const since = peerMap[peerId]?.version ?? "0"
     *
     *     // Fetch changes FROM THE REMOTE PEER (not this DB)
     *     const changes = yield* peerCrSql.pullChanges(since, [ourSiteId])
     *     // Apply them to THIS local database
     *     yield* CrSql.CrSql.applyChanges(changes)
     *
     *     if (changes.length > 0) {
     *       const latest = changes[changes.length - 1]!.db_version
     *       yield* CrSql.CrSql.setPeerVersion({ siteId: peerId, version: latest, seq: 0 })
     *     }
     *   }
     * })
     * ```
     *
     * @since 0.1.0
     * @category Peer Tracking
     * @see {@link listTrackedPeers} - For array-based access to peer data
     */
    trackedPeersMap,

    // TODO(effect-native): expose reactive helpers in service API
    // reactiveDbVersion,
    // reactivePeerVersion,
    // reactivePullChanges,

    /**
     * The underlying `SqlClient` instance used by this service.
     *
     * This provides direct access to the Effect SQL client that underlies all
     * CR-SQLite operations. Useful for executing custom queries, managing
     * transactions, or integrating with other Effect SQL-based code.
     *
     * **Usage Notes:**
     * - All CR-SQLite functions use this client internally
     * - Custom queries can be mixed with CR-SQLite operations
     * - Transaction management is shared between custom and CR-SQLite queries
     * - The client has CR-SQLite extension already loaded and verified
     *
     * @example
     * ```typescript
     * import { CrSql } from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const customQuery = Effect.gen(function* () {
     *   const crsql = yield* CrSql.CrSql
     *
     *   // Use the underlying SQL client directly
     *   const result = yield* crsql.sql`SELECT COUNT(*) as count FROM todos`
     *
     *   // Mixed with CR-SQLite operations
     *   const version = yield* crsql.getDbVersion
     *
     *   return { totalTodos: result[0].count, dbVersion: version }
     * })
     * ```
     *
     * @since 0.1.0
     * @category Integration
     */
    sql: sql satisfies SqlClient.SqlClient
  } as const

  return crsql
})

/**
 * CR-SQLite service accessor class for conflict-free replicated database operations.
 *
 * This Effect service provides a complete interface for working with CR-SQLite
 * (Conflict-free Replicated SQLite) databases. CR-SQLite enables multi-master
 * replication with automatic conflict resolution using CRDT semantics.
 *
 * **Service Usage:**
 * Use `CrSql.CrSql` accessors in Effect programs to interact with CR-SQLite-backed
 * databases. The service automatically handles extension loading, connection
 * management, and resource cleanup.
 *
 * **Core Features:**
 * - **Automatic setup**: Extension loading and connection verification
 * - **Type safety**: Full TypeScript integration with Effect schemas
 * - **Resource management**: Automatic cleanup via Effect finalizers
 * - **Multi-replica sync**: Built-in peer tracking and change synchronization
 * - **Schema evolution**: Declarative migrations with `automigrate`
 * - **Collaborative editing**: Fractional indexing for ordered data
 *
 * @example Basic usage:
 * ```typescript
 * import { CrSql } from "@effect-native/crsql"
 * import * as NodeSqlite from "@effect/sql-sqlite-node"
 * import { Effect, Layer } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   // Get site identifier
 *   const siteId = yield* CrSql.CrSql.getSiteIdHex
 *
 *   // Set up a replicated table
 *   yield* CrSql.CrSql.automigrate`
 *     CREATE TABLE IF NOT EXISTS todos (
 *       id BLOB PRIMARY KEY,
 *       text TEXT NOT NULL DEFAULT '',
 *       completed INTEGER NOT NULL DEFAULT 0
 *     );
 *     SELECT crsql_as_crr('todos');
 *   `
 *
 *   // Make changes that will be replicated
 *   const sql = yield* CrSql.CrSql.sql
 *   yield* sql`INSERT INTO todos VALUES (randomblob(16), 'Hello World', 0)`
 *
 *   // Export changes for synchronization
 *   const changes = yield* CrSql.CrSql.pullChanges("0")
 *   console.log(`Generated ${changes.length} changes`)
 * })
 *
 * // Run with SQLite layer
 * const layers = Layer.mergeAll(
 *   NodeSqlite.SqliteClient.layer({ filename: "app.db" }),
 *   CrSql.CrSql.Default
 * )
 *
 * Effect.provide(program, layers)
 * ```
 *
 * @example Service creation from existing client:
 * ```typescript
 * import { CrSql } from "@effect-native/crsql"
 * import * as NodeSqlite from "@effect/sql-sqlite-node"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const sqliteClient = yield* NodeSqlite.SqliteClient.SqliteClient
 *
 *   // Create CrSql service from existing client
 *   const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: sqliteClient })
 *
 *   // Use the service
 *   const version = yield* crsql.getDbVersion
 * })
 * ```
 *
 * @since 0.1.0
 */
export class CrSql extends Effect.Service<CrSql>()("CrSql", {
  accessors: true,
  effect: makeCrSql,
  dependencies: [CrSqliteExtension.ExtInfoLoaded.Default]
}) {
  static fromSqliteClient = Effect.fn("@effect-native/crsql/CrSql.fromSqliteClient")(
    function*(
      params: {
        sql: SqliteClient.SqliteClient
        /** when you want to take ownership of extension loading, provide this */
        loadedExtensionInfo?: Effect.Effect<CrSqlSchema.ExtInfoLoaded>
      }
    ) {
      // reuse the same SqlClient layer everywhere
      const layerSqlClient = Layer.succeed(SqlClient.SqlClient, params.sql)

      // load the extension via params or default to our standard loader
      const loadInfo = yield* params.loadedExtensionInfo?.pipe(
        Schema.decodeUnknown(CrSqlSchema.ExtInfoLoaded),
        Effect.catchTag("ParseError", (cause) => Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause }))),
        Effect.withSpan("params.loadedExtensionInfo")
      ) ??
        CrSqliteExtension.loadLibCrSql.pipe(Effect.provide(layerSqlClient))

      // proves that the extension has loaded
      const dbInfo = yield* CrSqliteExtension.sqlExtInfo.pipe(Effect.provide(layerSqlClient))

      const layers = Layer.mergeAll(
        layerSqlClient,
        Layer.succeed(
          CrSqliteExtension.ExtInfoLoaded,
          CrSqliteExtension.ExtInfoLoaded.make(CrSqlSchema.ExtInfo.make({ ...loadInfo, ...dbInfo }))
        )
      )

      return yield* makeCrSql.pipe(Effect.provide(layers))
    }
  )
}

function isTemplateStringsArray(first: string | TemplateStringsArray): first is TemplateStringsArray {
  return Array.isArray(first) && Object.hasOwn(first, "raw")
}
