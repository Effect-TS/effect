/**
 * One table of Trino values, in both directions against a real coordinator:
 *
 * - literal: the test writes the SQL literal itself (never the driver), the
 *   server evaluates it, and the driver must decode the expected value;
 * - parameter: the expected value is bound through the driver
 *   (`EXECUTE IMMEDIATE … USING`), cast to the column type, selected back, and
 *   must decode to itself.
 *
 * Both run in both value modes: the pg-style default (`Date`, decimals and the
 * other date and time types as text) and the Effect types of
 * `TrinoTypes.makeEffectRegistry()`. Values are compared through `canon`, which
 * spells every type out (instant and zone, normalized decimal digits,
 * nanoseconds, map entries, row fields in order), so `-0`, `NaN`, zones and
 * field order all count.
 */
import { TrinoClient, TrinoTypes } from "@effect/sql-trino"
import { assert, it } from "@effect/vitest"
import { BigDecimal, DateTime, Duration, Effect } from "effect"
import { layerClientIn, layerTimeout, type ValueMode, valueModes } from "./utils.ts"

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")

const canon = (value: unknown): unknown => {
  if (value === null || value === undefined) return null
  switch (typeof value) {
    case "number":
      return Number.isNaN(value) ? "NaN" : Object.is(value, -0) ? "-0" : value
    case "bigint":
      return `${value}n`
    case "string":
    case "boolean":
      return value
  }
  if (value instanceof Uint8Array) return { bytes: hex(value) }
  if (value instanceof Date) return { date: value.getTime() }
  if (BigDecimal.isBigDecimal(value)) return { decimal: BigDecimal.format(BigDecimal.normalize(value)) }
  if (DateTime.isDateTime(value)) {
    return {
      instant: DateTime.toEpochMillis(value),
      zone: DateTime.isZoned(value) ? DateTime.zoneToString(value.zone) : "Utc"
    }
  }
  if (value instanceof TrinoTypes.PreciseTimestamp) {
    return { precise: canon(value.dateTime), picosOfMilli: value.picosOfMilli }
  }
  if (value instanceof TrinoTypes.Time) {
    return { picosOfDay: `${value.picosOfDay}`, offsetMinutes: value.offsetMinutes ?? null }
  }
  if (value instanceof TrinoTypes.IntervalYearMonth) return { months: value.months + 0 }
  if (Duration.isDuration(value)) return { nanos: `${Duration.toNanosUnsafe(value)}` }
  if (Array.isArray(value)) return value.map(canon)
  if (value instanceof Map) return { map: [...value].map(([k, v]) => [canon(k), canon(v)]) }
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    // a ROW: field names and positions both matter
    return { row: Object.entries(value).map(([k, v]) => [k, canon(v)]) }
  }
  return { unexpected: Object.prototype.toString.call(value) }
}

interface Case {
  readonly name: string
  /** The column type a bound parameter is cast to; a case without one is not bound. */
  readonly type?: string
  /** SQL that makes the server produce the value, written by the test. */
  readonly literal: string
  readonly default: unknown
  readonly effect: unknown
}

const both = (name: string, type: string | undefined, literal: string, value: unknown): Case => ({
  name,
  ...(type === undefined ? {} : { type }),
  literal,
  default: value,
  effect: value
})

const utc = (year: number, month: number, day: number, ms = 0) => Date.UTC(year, month - 1, day) + ms
const msOfClock = (h: number, m: number, s: number, ms: number) => ((h * 60 + m) * 60 + s) * 1000 + ms
const day = Date.UTC(2026, 10, 11)
const at = day + msOfClock(10, 0, 0, 123)
const picos = (h: number, m: number, s: number, micros: number) =>
  BigInt(msOfClock(h, m, s, 0)) * 10n ** 9n + BigInt(micros) * 10n ** 6n

const cases: ReadonlyArray<Case> = [
  both("boolean", "boolean", "true", true),
  both("tinyint", "tinyint", "TINYINT '-128'", -128),
  both("smallint", "smallint", "SMALLINT '32767'", 32767),
  both("integer", "integer", "INTEGER '-2147483648'", -2147483648),
  both("bigint max", "bigint", "BIGINT '9223372036854775807'", 9223372036854775807n),
  both("bigint beyond 2^53", "bigint", "BIGINT '9007199254740993'", 9007199254740993n),
  both("real", "real", "REAL '1.5'", 1.5),
  both("double negative zero", "double", "DOUBLE '-0'", -0),
  both("double NaN", "double", "nan()", NaN),
  both("double -Infinity", "double", "-infinity()", -Infinity),
  {
    name: "decimal(38, 10)",
    type: "decimal(38, 10)",
    literal: "DECIMAL '12345678901234567890.0123456789'",
    default: "12345678901234567890.0123456789",
    effect: BigDecimal.fromStringUnsafe("12345678901234567890.0123456789")
  },
  {
    name: "decimal(10, 2) negative",
    type: "decimal(10, 2)",
    literal: "DECIMAL '-0.05'",
    default: "-0.05",
    effect: BigDecimal.fromStringUnsafe("-0.05")
  },
  {
    name: "number",
    type: "number",
    literal: "NUMBER '1.5'",
    default: "1.5",
    effect: BigDecimal.fromStringUnsafe("1.5")
  },
  both(
    "varchar with quotes and unicode",
    "varchar",
    "'O''Brien; DROP TABLE t; -- ü 😀'",
    "O'Brien; DROP TABLE t; -- ü 😀"
  ),
  both("char(5) padding", "char(5)", "CAST('ab' AS char(5))", "ab   "),
  both("varbinary", "varbinary", "X'00ff'", new Uint8Array([0, 255])),
  both("json", undefined, "JSON '{\"a\":1}'", "{\"a\":1}"),
  both("uuid", "uuid", "UUID '12151fd2-7586-11e9-8f9e-2a86e4085a59'", "12151fd2-7586-11e9-8f9e-2a86e4085a59"),
  both("ipaddress", "ipaddress", "IPADDRESS '2001:db8::1'", "2001:db8::1"),
  both("null", "bigint", "CAST(NULL AS bigint)", null),
  {
    name: "date",
    type: "date",
    literal: "DATE '2026-11-11'",
    default: "2026-11-11",
    effect: DateTime.makeUnsafe(day)
  },
  {
    name: "date before the Gregorian cutover",
    type: "date",
    literal: "DATE '1582-10-04'",
    default: "1582-10-04",
    effect: DateTime.makeUnsafe(utc(1582, 10, 4))
  },
  {
    name: "time(6)",
    type: "time(6)",
    literal: "TIME '10:00:00.123456'",
    default: "10:00:00.123456",
    effect: new TrinoTypes.Time({ picosOfDay: picos(10, 0, 0, 123_456), offsetMinutes: undefined })
  },
  {
    name: "time(3) with time zone",
    type: "time(3) with time zone",
    literal: "TIME '10:00:00.123 +05:30'",
    default: "10:00:00.123+05:30",
    effect: new TrinoTypes.Time({ picosOfDay: picos(10, 0, 0, 123_000), offsetMinutes: 330 })
  },
  {
    name: "timestamp(3)",
    type: "timestamp(3)",
    literal: "TIMESTAMP '2026-11-11 10:00:00.123'",
    default: new Date(at),
    effect: DateTime.makeUnsafe(at)
  },
  {
    // the default decoding is a Date: milliseconds only
    name: "timestamp(6)",
    type: "timestamp(6)",
    literal: "TIMESTAMP '2026-11-11 10:00:00.123456'",
    default: new Date(at),
    effect: new TrinoTypes.PreciseTimestamp({ dateTime: DateTime.makeUnsafe(at), picosOfMilli: 456_000_000 })
  },
  {
    name: "timestamp(12) at the end of year 9999",
    type: "timestamp(12)",
    literal: "TIMESTAMP '9999-12-31 23:59:59.999999999999'",
    default: new Date(utc(9999, 12, 31, 86_399_999)),
    effect: new TrinoTypes.PreciseTimestamp({
      dateTime: DateTime.makeUnsafe(utc(9999, 12, 31, 86_399_999)),
      picosOfMilli: 999_999_999
    })
  },
  {
    // the default decoding is the instant; the zone is dropped
    name: "timestamp(3) with time zone",
    type: "timestamp(3) with time zone",
    literal: "TIMESTAMP '2026-11-11 10:00:00.123 Europe/Dublin'",
    default: new Date(at),
    effect: DateTime.makeZonedUnsafe(at, { timeZone: "Europe/Dublin" })
  },
  {
    name: "interval day to second",
    type: "interval day to second",
    literal: "INTERVAL '1 02:03:04.005' DAY TO SECOND",
    default: "1 02:03:04.005000",
    effect: Duration.millis(93_784_005)
  },
  {
    name: "interval year to month",
    type: "interval year to month",
    literal: "INTERVAL '-14' MONTH",
    default: "-1-2",
    effect: new TrinoTypes.IntervalYearMonth({ months: -14 })
  },
  both("array with a null", "array(integer)", "ARRAY[1, NULL, 3]", [1, null, 3]),
  both(
    "map with a bigint key",
    "map(bigint, varchar)",
    "MAP(ARRAY[BIGINT '9007199254740993'], ARRAY['x'])",
    new Map([[9007199254740993n, "x"]])
  ),
  both(
    "named row",
    "row(id integer, name varchar)",
    "CAST(ROW(1, 'x') AS ROW(id integer, name varchar))",
    { id: 1, name: "x" }
  ),
  both("unnamed row", undefined, "ROW(1, 'x')", { field0: 1, field1: "x" }),
  {
    name: "array of map of row, nested",
    literal: "ARRAY[MAP(ARRAY['k'], ARRAY[ROW(DATE '2026-11-11', CAST(NULL AS varchar))])]",
    default: [new Map([["k", { field0: "2026-11-11", field1: null }]])],
    effect: [new Map([["k", { field0: DateTime.makeUnsafe(day), field1: null }]])]
  }
]

const expected = (testCase: Case, mode: ValueMode) => mode === "default" ? testCase.default : testCase.effect

// Every mismatch is reported at once, so one run shows all of them.
const compare = (mode: ValueMode, row: Record<string, unknown>, selected: ReadonlyArray<Case>, how: string) => {
  const mismatches = selected.flatMap((testCase, index) => {
    const actual = canon(row[`c${index}`])
    const wanted = canon(expected(testCase, mode))
    return JSON.stringify(actual) === JSON.stringify(wanted) ? [] : [{ name: testCase.name, actual, wanted }]
  })
  assert.deepStrictEqual(mismatches, [], how)
}

for (const mode of valueModes) {
  it.layer(layerClientIn(mode), { timeout: layerTimeout, excludeTestServices: true })(
    `Values (${mode})`,
    (it) => {
      it.effect("decodes a literal of every type", () =>
        Effect.gen(function*() {
          const sql = yield* TrinoClient.TrinoClient
          const [row] = yield* sql.unsafe<Record<string, unknown>>(
            `SELECT ${cases.map((testCase, index) => `${testCase.literal} AS c${index}`).join(", ")}`
          )
          compare(mode, row, cases, "literal")
        }), 120_000)

      it.effect("round-trips a bound parameter of every type", () =>
        Effect.gen(function*() {
          const sql = yield* TrinoClient.TrinoClient
          const bound = cases.filter((testCase) => testCase.type !== undefined)
          // The Effect-mode value is what the encoder accepts, in either mode.
          const [row] = yield* sql.unsafe<Record<string, unknown>>(
            `SELECT ${bound.map((testCase, index) => `CAST(? AS ${testCase.type}) AS c${index}`).join(", ")}`,
            bound.map((testCase) => testCase.effect)
          )
          compare(mode, row, bound, "parameter")
        }), 120_000)

      it.effect("columns keep their parametric types", () =>
        Effect.gen(function*() {
          const sql = yield* TrinoClient.TrinoClient
          const raw = (yield* sql.unsafe(
            "SELECT TIMESTAMP '2020-01-01 00:00:00.123456789' AS ts, TIME '00:00:00.123456' AS t, NUMBER '1.5' AS n"
          ).raw) as TrinoClient.RawResult
          // without the client capabilities these would be timestamp(3), time(3) and varchar
          assert.deepStrictEqual(raw.columns.map((column) => column.type), ["timestamp(9)", "time(6)", "number"])
        }), 120_000)
    }
  )
}
