import { TrinoTypes } from "@effect/sql-trino"
import * as Json from "@effect/sql-trino/internal/json"
import * as Literals from "@effect/sql-trino/internal/literals"
import { assert, describe, it } from "@effect/vitest"
import * as BigDecimal from "effect/BigDecimal"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Result from "effect/Result"

const render = (value: unknown): string => Result.getOrThrow(Literals.render(value))

const refused = (value: unknown) => {
  const result = Literals.render(value)
  assert.isTrue(Result.isFailure(result))
  if (Result.isFailure(result)) assert.strictEqual(result.failure._tag, "EncodeFailure")
}

describe("Literals", () => {
  it("renders scalars with types Trino infers correctly", () => {
    assert.strictEqual(render(null), "NULL")
    assert.strictEqual(render(undefined), "NULL")
    assert.strictEqual(render(true), "true")
    assert.strictEqual(render(42), "42")
    assert.strictEqual(render(-7), "-7")
    assert.strictEqual(render(-0), "DOUBLE '-0'")
    assert.strictEqual(render(1.5), "DOUBLE '1.5'")
    assert.strictEqual(render(Number.NaN), "DOUBLE 'NaN'")
    assert.strictEqual(render(Number.NEGATIVE_INFINITY), "DOUBLE '-Infinity'")
    assert.strictEqual(render(BigInt("9223372036854775807")), "BIGINT '9223372036854775807'")
    assert.strictEqual(render(BigInt("9223372036854775808")), "DECIMAL '9223372036854775808'")
    assert.strictEqual(render(new Uint8Array([0, 15, 255])), "X'000fff'")
    assert.strictEqual(render(new Int8Array([-1])), "X'ff'")
  })

  it("doubles quotes in strings", () => {
    assert.strictEqual(render("it's"), "'it''s'")
    assert.strictEqual(render("'; DROP TABLE t; --"), "'''; DROP TABLE t; --'")
  })

  it("renders decimals in plain notation and refuses more than 38 digits", () => {
    assert.strictEqual(render(BigDecimal.fromStringUnsafe("1.50")), "DECIMAL '1.50'")
    assert.strictEqual(render(BigDecimal.fromStringUnsafe("-0.001")), "DECIMAL '-0.001'")
    assert.strictEqual(render(BigDecimal.make(BigInt(12), -3)), "DECIMAL '12000'")
    assert.strictEqual(render(BigDecimal.fromStringUnsafe("0")), "DECIMAL '0'")
    refused(BigDecimal.fromStringUnsafe("1".repeat(39)))
    refused(BigInt("1".repeat(39)))
  })

  it("renders instants as zoned timestamps", () => {
    assert.strictEqual(render(new Date(Date.UTC(2020, 0, 2, 3, 4, 5, 6))), "TIMESTAMP '2020-01-02 03:04:05.006 UTC'")
    refused(new Date(Number.NaN))
    const utc = DateTime.makeUnsafe(Date.UTC(1999, 11, 31, 23, 59, 59, 999))
    assert.strictEqual(render(utc), "TIMESTAMP '1999-12-31 23:59:59.999 UTC'")
    const zoned = DateTime.makeZonedUnsafe(Date.UTC(2021, 2, 14, 6, 30), { timeZone: "America/New_York" })
    assert.strictEqual(
      render(zoned),
      "(TIMESTAMP '2021-03-14 06:30:00.000 UTC' AT TIME ZONE 'America/New_York')"
    )
    // the repeated 01:30 of a fall-back stays the later instant
    const repeated = DateTime.makeZonedUnsafe(Date.UTC(2021, 10, 7, 6, 30), { timeZone: "America/New_York" })
    assert.strictEqual(
      render(repeated),
      "(TIMESTAMP '2021-11-07 06:30:00.000 UTC' AT TIME ZONE 'America/New_York')"
    )
    const offset = DateTime.makeZonedUnsafe(0, { timeZone: 5.5 * 3_600_000 })
    assert.strictEqual(render(offset), "(TIMESTAMP '1970-01-01 00:00:00.000 UTC' AT TIME ZONE '+05:30')")
    const precise = new TrinoTypes.PreciseTimestamp({ dateTime: utc, picosOfMilli: 456_000_000 })
    assert.strictEqual(render(precise), "TIMESTAMP '1999-12-31 23:59:59.999456 UTC'")
  })

  it("renders times and intervals", () => {
    const picosPerSecond = BigInt("1000000000000")
    assert.strictEqual(
      render(
        new TrinoTypes.Time({ picosOfDay: BigInt(3723) * picosPerSecond + BigInt(500), offsetMinutes: undefined })
      ),
      "TIME '01:02:03.0000000005'"
    )
    assert.strictEqual(
      render(new TrinoTypes.Time({ picosOfDay: BigInt(3723) * picosPerSecond, offsetMinutes: -510 })),
      "TIME '01:02:03-08:30'"
    )
    assert.strictEqual(
      render(Duration.millis(-((26 * 60 + 3) * 60 + 4) * 1000 - 567)),
      "INTERVAL - '1 02:03:04.567' DAY TO SECOND"
    )
    assert.strictEqual(render(Duration.nanos(BigInt(1))), "INTERVAL '0 00:00:00.000000001' DAY TO SECOND")
    refused(Duration.infinity)
    assert.strictEqual(render(new TrinoTypes.IntervalYearMonth({ months: -14 })), "INTERVAL - '1-2' YEAR TO MONTH")
  })

  it("renders arrays, maps and rows recursively", () => {
    assert.strictEqual(render([1, "a", null]), "ARRAY[1, 'a', NULL]")
    assert.strictEqual(render([]), "ARRAY[]")
    assert.strictEqual(render(new Map([["k", [BigInt(1)]]])), "MAP(ARRAY['k'], ARRAY[ARRAY[BIGINT '1']])")
    assert.strictEqual(render(new Map()), "MAP()")
    assert.strictEqual(render({ id: 1, name: "x" }), "ROW(1, 'x')")
    assert.strictEqual(render(new Json.JsonNumber("9007199254740993")), "BIGINT '9007199254740993'")
    refused({})
    refused(Symbol("s"))
    refused(
      new (class Opaque {
        readonly field = 1
      })()
    )
  })

  it("renders typed values as casts and validates the type", () => {
    assert.strictEqual(render(new Literals.TypedValue("date", "2020-01-02")), "CAST('2020-01-02' AS date)")
    assert.strictEqual(render(new Literals.TypedValue("json", "{\"a\":1}")), "JSON '{\"a\":1}'")
    assert.strictEqual(
      render(new Literals.TypedValue("row(\"a b\" bigint, c varchar(10))", [1, "x"])),
      "CAST(ARRAY[1, 'x'] AS row(\"a b\" bigint, c varchar(10)))"
    )
    assert.strictEqual(
      render(new Literals.TypedValue("timestamp(6) with time zone", null)),
      "CAST(NULL AS timestamp(6) with time zone)"
    )
    refused(new Literals.TypedValue("varchar) --", "x"))
    refused(new Literals.TypedValue("varchar'", "x"))
    refused(new Literals.TypedValue("varchar(", "x"))
    refused(new Literals.TypedValue("\"unterminated", "x"))
  })

  it("wraps parameterized statements in EXECUTE IMMEDIATE", () => {
    assert.strictEqual(Result.getOrThrow(Literals.renderStatement("SELECT 1", [])), "SELECT 1")
    assert.strictEqual(
      Result.getOrThrow(Literals.renderStatement("SELECT ? WHERE name = 'o''k'", ["it's"])),
      "EXECUTE IMMEDIATE 'SELECT ? WHERE name = ''o''''k''' USING 'it''s'"
    )
    assert.isTrue(Result.isFailure(Literals.renderStatement("SELECT ?", [Symbol("s")])))
  })
})
