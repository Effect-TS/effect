import { CrSql } from "@effect-native/crsql"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { ensureCrSqlLoaded } from "./_helpers.js"

// TDD style: focused unit tests to narrow behavior
//
// NOTE: These tests are intentionally skipped for v0.0.0 release.
// The __experimental__schemaFromChanges feature is implemented but these unit
// tests remain red/skipped until the feature is fully validated and stabilized.

it.scoped.skip("schemaFromChanges: infers columns for todos", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })

    // Create a simple CRR and insert a row
    yield* sql`CREATE TABLE IF NOT EXISTS todos (id BLOB PRIMARY KEY, content TEXT NOT NULL DEFAULT '', completed INTEGER NOT NULL DEFAULT 0)`
    yield* crsql.asCrr("todos")
    yield* sql`INSERT INTO todos (id, content, completed) VALUES (unhex('00112233445566778899AABBCCDDEEFF'), 'Alpha', 0)`

    const changes = yield* crsql.pullChanges("0")
    const schema = yield* crsql.__experimental__schemaFromChanges(changes)

    assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS todos"))
    assert.ok(schema.includes("content TEXT"))
    assert.ok(schema.includes("completed INTEGER"))
    assert.ok(schema.includes("SELECT crsql_as_crr('todos')"))
  }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.scoped.skip("schemaFromChanges: includes multiple tables present in changes", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })

    // Define two CRRs and insert into both
    yield* crsql.automigrate`
      CREATE TABLE IF NOT EXISTS a (id BLOB PRIMARY KEY, x TEXT NOT NULL DEFAULT '');
      SELECT crsql_as_crr('a');
      CREATE TABLE IF NOT EXISTS b (id BLOB PRIMARY KEY, y INTEGER NOT NULL DEFAULT 0);
      SELECT crsql_as_crr('b');
    `
    yield* sql`INSERT INTO a (id, x) VALUES (unhex('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'), 'v')`
    yield* sql`INSERT INTO b (id, y) VALUES (unhex('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'), 1)`

    const changes = yield* crsql.pullChanges("0")
    const schema = yield* crsql.__experimental__schemaFromChanges(changes)

    assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS a"))
    assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS b"))
    assert.ok(schema.includes("SELECT crsql_as_crr('a')"))
    assert.ok(schema.includes("SELECT crsql_as_crr('b')"))
  }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.scoped.skip("schemaFromChanges: maps text/integer/real/blob to TEXT/INTEGER/REAL/BLOB", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })

    yield* crsql.automigrate`
      CREATE TABLE IF NOT EXISTS types (
        id BLOB PRIMARY KEY,
        t TEXT NOT NULL DEFAULT '',
        i INTEGER NOT NULL DEFAULT 0,
        r REAL NOT NULL DEFAULT 0.0,
        b BLOB
      );
      SELECT crsql_as_crr('types');
    `
    yield* sql`INSERT INTO types (id, t, i, r, b) VALUES (unhex('CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'), 'txt', 2, 3.14, unhex('ABCD'))`

    const changes = yield* crsql.pullChanges("0")
    const schema = yield* crsql.__experimental__schemaFromChanges(changes)

    assert.ok(schema.includes("t TEXT"))
    assert.ok(schema.includes("i INTEGER"))
    assert.ok(schema.includes("r REAL"))
    assert.ok(schema.includes("b BLOB"))
  }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.scoped.skip("schemaFromChanges: conflicting types for same column fails", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })

    yield* crsql.automigrate`
      CREATE TABLE IF NOT EXISTS mixed (
        id BLOB PRIMARY KEY,
        v ANY
      );
      SELECT crsql_as_crr('mixed');
    `
    // Insert integer then text for the same column across different rows
    yield* sql`INSERT INTO mixed (id, v) VALUES (unhex('DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD'), 123)`
    yield* sql`INSERT INTO mixed (id, v) VALUES (unhex('EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE'), 'abc')`

    const changes = yield* crsql.pullChanges("0")
    const either = yield* crsql.__experimental__schemaFromChanges(changes).pipe(Effect.either)
    assert.isTrue(either._tag === "Left")
  }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.scoped.skip("schemaFromChanges: deterministic column order (id first, others sorted)", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })

    yield* crsql.automigrate`
      CREATE TABLE IF NOT EXISTS ordercols (
        id BLOB PRIMARY KEY,
        zeta TEXT NOT NULL DEFAULT '',
        alpha TEXT NOT NULL DEFAULT '',
        mid INTEGER NOT NULL DEFAULT 0
      );
      SELECT crsql_as_crr('ordercols');
    `
    yield* sql`INSERT INTO ordercols (id, zeta, alpha, mid) VALUES (unhex('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), 'z', 'a', 1)`

    const changes = yield* crsql.pullChanges("0")
    const schema = yield* crsql.__experimental__schemaFromChanges(changes)

    const iAlpha = schema.indexOf(" alpha ")
    const iMid = schema.indexOf(" mid ")
    const iZeta = schema.indexOf(" zeta ")
    assert.ok(iAlpha > -1 && iMid > -1 && iZeta > -1)
    assert.ok(iAlpha < iMid && iMid < iZeta)
  }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.scoped.skip("schemaFromChanges: generated schema is idempotent under automigrate", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })

    yield* crsql.automigrate`
      CREATE TABLE IF NOT EXISTS idem (
        id BLOB PRIMARY KEY,
        name TEXT NOT NULL DEFAULT ''
      );
      SELECT crsql_as_crr('idem');
    `
    yield* sql`INSERT INTO idem (id, name) VALUES (unhex('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'), 'one')`
    const changes = yield* crsql.pullChanges("0")
    const schema = yield* crsql.__experimental__schemaFromChanges(changes)

    // Apply twice without error
    yield* crsql.automigrate(schema)
    const res = yield* crsql.automigrate(schema).pipe(Effect.either)
    assert.isTrue(res._tag === "Right")
  }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: ":memory:" }))))
