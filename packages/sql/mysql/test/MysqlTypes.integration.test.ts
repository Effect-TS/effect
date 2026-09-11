import { MysqlConnection } from "@effect/sql-mysql"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import { MysqlContainer, resultSet, rowsOf } from "./utils.ts"

const connect = (overrides: Partial<MysqlConnection.Config> = {}) =>
  Effect.flatMap(MysqlContainer, (container) =>
    MysqlConnection.make({
      url: Redacted.make(container.getConnectionUri()),
      ...overrides
    }))

/** Reads one expression back through the text protocol. */
const scalar = (expression: string, overrides: Partial<MysqlConnection.Config> = {}) =>
  Effect.gen(function*() {
    const conn = yield* connect(overrides)
    const results = yield* conn.query(`SELECT ${expression} AS value`)
    return resultSet(results[0]).rows[0].value
  }).pipe(Effect.scoped)

describe("MysqlTypes", () => {
  it.layer(MysqlContainer.layer, { timeout: "120 seconds" })("text protocol", (it) => {
    it.effect("decodes integers as numbers and BIGINT as bigint", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query(`CREATE TABLE ints (
          t TINYINT, s SMALLINT, m MEDIUMINT, i INT, b BIGINT, u BIGINT UNSIGNED, y YEAR
        )`)
        yield* conn.query(
          "INSERT INTO ints VALUES (-8, -300, -70000, -2147483648, -9223372036854775808, 18446744073709551615, 2026)"
        )
        const rows = rowsOf(yield* conn.query("SELECT * FROM ints"))
        assert.deepStrictEqual(rows[0], {
          t: -8,
          s: -300,
          m: -70000,
          i: -2147483648,
          b: -9223372036854775808n,
          u: 18446744073709551615n,
          y: 2026
        })
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("decodes BIGINT as a number when asked", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* scalar("CAST(42 AS SIGNED)", { bigintAsNumber: true }), 42)
      }), { timeout: 60_000 })

    it.effect("keeps DECIMAL exact by decoding it as a string", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE money (amount DECIMAL(20, 4))")
        yield* conn.query("INSERT INTO money VALUES ('12345678901234.5678')")
        const rows = rowsOf(yield* conn.query("SELECT * FROM money"))
        assert.strictEqual(rows[0].amount, "12345678901234.5678")
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("decodes floating point as numbers", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE floats (f FLOAT, d DOUBLE)")
        yield* conn.query("INSERT INTO floats VALUES (1.5, -2.25e10)")
        const rows = rowsOf(yield* conn.query("SELECT * FROM floats"))
        assert.strictEqual(rows[0].f, 1.5)
        assert.strictEqual(rows[0].d, -22500000000)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("decodes DATE as a string and DATETIME as epoch milliseconds", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE times (d DATE, dt DATETIME(6), ts TIMESTAMP)")
        yield* conn.query(
          "INSERT INTO times VALUES ('2026-09-10', '2026-09-10 14:30:05.123456', '2026-09-10 14:30:05')"
        )
        const rows = rowsOf(yield* conn.query("SELECT * FROM times"))
        assert.strictEqual(rows[0].d, "2026-09-10")
        assert.strictEqual(rows[0].dt, Date.UTC(2026, 8, 10, 14, 30, 5, 123))
        assert.strictEqual(rows[0].ts, Date.UTC(2026, 8, 10, 14, 30, 5))
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("decodes temporal columns as strings when asked", () =>
      Effect.gen(function*() {
        const conn = yield* connect({ dateStrings: true })
        yield* conn.query("CREATE TABLE stringy (dt DATETIME)")
        yield* conn.query("INSERT INTO stringy VALUES ('2026-09-10 14:30:05')")
        const rows = rowsOf(yield* conn.query("SELECT * FROM stringy"))
        assert.strictEqual(rows[0].dt, "2026-09-10 14:30:05")
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("decodes TIME as signed microseconds, since it is a duration", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE durations (a TIME(6), b TIME)")
        yield* conn.query("INSERT INTO durations VALUES ('838:59:59.000000', '-01:00:30')")
        const rows = rowsOf(yield* conn.query("SELECT * FROM durations"))
        assert.strictEqual(rows[0].a, 838n * 3_600_000_000n + 59n * 60_000_000n + 59n * 1_000_000n)
        assert.strictEqual(rows[0].b, -(3_600_000_000n + 30_000_000n))
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("tells BLOB from TEXT by the binary collation", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE blobs (t TEXT, b BLOB, v VARBINARY(16), c VARCHAR(16))")
        yield* conn.query("INSERT INTO blobs VALUES ('text', x'DEADBEEF', x'0102', 'chars')")
        const rows = rowsOf(yield* conn.query("SELECT * FROM blobs"))
        assert.strictEqual(rows[0].t, "text")
        assert.strictEqual(rows[0].c, "chars")
        assert.instanceOf(rows[0].b, Uint8Array)
        assert.deepStrictEqual(Array.from(rows[0].b as Uint8Array), [0xde, 0xad, 0xbe, 0xef])
        assert.deepStrictEqual(Array.from(rows[0].v as Uint8Array), [0x01, 0x02])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("parses JSON columns", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE docs (body JSON)")
        yield* conn.query(`INSERT INTO docs VALUES ('{"a":[1,2],"b":"x"}')`)
        const rows = rowsOf(yield* conn.query("SELECT * FROM docs"))
        assert.deepStrictEqual(rows[0].body, { a: [1, 2], b: "x" })
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("decodes BIT as a bigint", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE flags (a BIT(1), b BIT(16))")
        yield* conn.query("INSERT INTO flags VALUES (b'1', b'1000000010000001')")
        const rows = rowsOf(yield* conn.query("SELECT * FROM flags"))
        assert.strictEqual(rows[0].a, 1n)
        assert.strictEqual(rows[0].b, 0b1000000010000001n)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("decodes ENUM and SET as strings", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE choices (e ENUM('a','b'), s SET('x','y'))")
        yield* conn.query("INSERT INTO choices VALUES ('b', 'x,y')")
        const rows = rowsOf(yield* conn.query("SELECT * FROM choices"))
        assert.strictEqual(rows[0].e, "b")
        assert.strictEqual(rows[0].s, "x,y")
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("round-trips multi-byte text", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE unicode (v VARCHAR(64)) CHARACTER SET utf8mb4")
        yield* conn.query("INSERT INTO unicode VALUES ('héllo 🌍 日本語')")
        const rows = rowsOf(yield* conn.query("SELECT * FROM unicode"))
        assert.strictEqual(rows[0].v, "héllo 🌍 日本語")
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("reads a row whose leading column is empty or NULL", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        // A row starting 0x00 and at least seven bytes long would read as an OK
        // packet, and one starting 0xfb as a LOCAL INFILE request, if packet
        // classification ignored the phase it is in.
        const rows = rowsOf(
          yield* conn.query("SELECT '' AS a, 'aaaaaaaa' AS b UNION ALL SELECT NULL, 'bbbbbbbb'")
        )
        assert.deepStrictEqual(rows, [{ a: "", b: "aaaaaaaa" }, { a: null, b: "bbbbbbbb" }])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("renders dateStrings to the column's precision on both protocols", () =>
      Effect.gen(function*() {
        const conn = yield* connect({ dateStrings: true })
        yield* conn.query(`CREATE TABLE stamps (
          d0 DATETIME(0), d3 DATETIME(3), d6 DATETIME(6), dz DATETIME(6),
          t0 TIME(0), t3 TIME(3), t6 TIME(6), tneg TIME(6), tz TIME(6)
        )`)
        yield* conn.query(`INSERT INTO stamps VALUES (
          '2024-01-02 03:04:05', '2024-01-02 03:04:05.123', '2024-01-02 03:04:05.123456',
          '2024-01-02 03:04:05.000000',
          '01:02:03', '01:02:03.123', '01:02:03.123456', '-838:59:58.999999', '01:02:03.000000'
        )`)
        const expected = {
          d0: "2024-01-02 03:04:05",
          d3: "2024-01-02 03:04:05.123",
          d6: "2024-01-02 03:04:05.123456",
          // Whole seconds: the binary protocol omits the microseconds field
          // entirely, so the trailing zeroes can only come from the column.
          dz: "2024-01-02 03:04:05.000000",
          t0: "01:02:03",
          t3: "01:02:03.123",
          t6: "01:02:03.123456",
          tneg: "-838:59:58.999999",
          tz: "01:02:03.000000"
        }
        const columns = Object.keys(expected).join(", ")
        // The binary protocol carries the parts and has to format them; the
        // text protocol carries the server's own string. They must agree.
        const [binary] = yield* conn.execute(`SELECT ${columns} FROM stamps`, [])
        assert.deepStrictEqual(resultSet(binary).rows[0], expected)
        const [text] = yield* conn.query(`SELECT ${columns} FROM stamps`)
        assert.deepStrictEqual(resultSet(text).rows[0], expected)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("decodes NULL in every column type", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE nulls (i INT, b BIGINT, d DECIMAL(4,2), t TEXT, j JSON, dt DATETIME)")
        yield* conn.query("INSERT INTO nulls VALUES (NULL, NULL, NULL, NULL, NULL, NULL)")
        const rows = rowsOf(yield* conn.query("SELECT * FROM nulls"))
        assert.deepStrictEqual(rows[0], { i: null, b: null, d: null, t: null, j: null, dt: null })
      }).pipe(Effect.scoped), { timeout: 60_000 })
  })
})
