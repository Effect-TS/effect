import { TrinoTypes } from "@effect/sql-trino"
import * as Codec from "@effect/sql-trino/internal/codec"
import * as Json from "@effect/sql-trino/internal/json"
import { assert, describe, it } from "@effect/vitest"
import * as BigDecimal from "effect/BigDecimal"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Result from "effect/Result"

type Column = TrinoTypes.Column
type TypeArgument = TrinoTypes.TypeArgument
type TypeSignature = TrinoTypes.TypeSignature

const sig = (rawType: string, ...args: ReadonlyArray<TypeArgument>): TypeSignature => ({ rawType, arguments: args })
const long = (value: number): TypeArgument => ({ kind: "LONG", value })
const type = (value: TypeSignature): TypeArgument => ({ kind: "TYPE", value })
const named = (fieldName: string | undefined, value: TypeSignature): TypeArgument => ({
  kind: "NAMED_TYPE",
  fieldName,
  value
})
const column = (name: string, typeSignature: TypeSignature): Column => ({
  name,
  type: typeSignature.rawType,
  typeSignature
})

/** Decodes one value of the given type from its wire JSON text. */
const decodeOne = (signature: TypeSignature, wire: string, types?: TrinoTypes.Registry): unknown => {
  const row = Json.asArray(Result.getOrThrow(Json.parse(`[${wire}]`))) ?? []
  return Result.getOrThrow(Codec.rowDecoder([column("c", signature)], types).decode(row))[0]
}

const decodeFails = (signature: TypeSignature, wire: string, types?: TrinoTypes.Registry) => {
  const row = Json.asArray(Result.getOrThrow(Json.parse(`[${wire}]`))) ?? []
  const result = Codec.rowDecoder([column("c", signature)], types).decode(row)
  assert.isTrue(Result.isFailure(result), wire)
  if (Result.isFailure(result)) {
    assert.strictEqual(result.failure._tag, "DecodeFailure")
    assert.strictEqual(result.failure.column, "c")
  }
}

describe("Codec", () => {
  it("decodes integers, keeping BIGINT exact", () => {
    assert.strictEqual(decodeOne(sig("integer"), "-2147483648"), -2147483648)
    assert.strictEqual(decodeOne(sig("tinyint"), "7"), 7)
    assert.strictEqual(decodeOne(sig("bigint"), "9223372036854775807"), BigInt("9223372036854775807"))
    assert.strictEqual(decodeOne(sig("bigint"), "9007199254740993"), BigInt("9007199254740993"))
    assert.strictEqual(decodeOne(sig("bigint"), "\"-42\""), BigInt(-42))
    decodeFails(sig("bigint"), "9223372036854775808")
    decodeFails(sig("integer"), "1.5")
  })

  it("decodes floating point including the string forms of non-finite values", () => {
    assert.strictEqual(decodeOne(sig("double"), "1.5E300"), 1.5e300)
    assert.isTrue(Number.isNaN(decodeOne(sig("double"), "\"NaN\"")))
    assert.strictEqual(decodeOne(sig("real"), "\"-Infinity\""), Number.NEGATIVE_INFINITY)
  })

  it("decodes DECIMAL and NUMBER as the text the server wrote", () => {
    assert.strictEqual(
      decodeOne(sig("decimal", long(38), long(2)), "\"123456789012345678901234567890123456.78\""),
      "123456789012345678901234567890123456.78"
    )
    assert.strictEqual(decodeOne(sig("number"), "\"1E+10\""), "1E+10")
    assert.strictEqual(decodeOne(sig("number"), "\"+Infinity\""), "+Infinity")
    assert.strictEqual(decodeOne(sig("decimal", long(5), long(1)), "1.5"), "1.5")
    decodeFails(sig("decimal", long(5), long(1)), "true")
  })

  it("decodes text, char padding included, and base64 bytes", () => {
    assert.strictEqual(decodeOne(sig("varchar", long(2147483647)), "\"héllo\""), "héllo")
    assert.strictEqual(decodeOne(sig("char", long(4)), "\"ab  \""), "ab  ")
    assert.strictEqual(decodeOne(sig("json"), "\"{\\\"a\\\":1}\""), "{\"a\":1}")
    assert.deepStrictEqual(decodeOne(sig("varbinary"), "\"AAH/\""), new Uint8Array([0, 1, 255]))
  })

  it("decodes date, time and interval values as text", () => {
    assert.strictEqual(decodeOne(sig("date"), "\"2024-02-29\""), "2024-02-29")
    assert.strictEqual(decodeOne(sig("date"), "\"-0001-01-01\""), "-0001-01-01")
    assert.strictEqual(decodeOne(sig("time", long(12)), "\"23:59:59.999999999999\""), "23:59:59.999999999999")
    assert.strictEqual(decodeOne(sig("time with time zone", long(0)), "\"01:02:03-08:30\""), "01:02:03-08:30")
    assert.strictEqual(decodeOne(sig("interval day to second"), "\"-1 02:03:04.567\""), "-1 02:03:04.567")
    assert.strictEqual(decodeOne(sig("interval year to month"), "\"-1-2\""), "-1-2")
    decodeFails(sig("date"), "1")
  })

  it("decodes TIMESTAMP as a Date: the wall clock read as UTC fields, truncated to milliseconds", () => {
    const millis = decodeOne(sig("timestamp", long(3)), "\"2020-05-06 07:08:09.123\"") as Date
    assert.strictEqual(millis.toISOString(), "2020-05-06T07:08:09.123Z")
    // without PARAMETRIC_DATETIME the server sends a bare signature
    const bare = decodeOne(sig("timestamp"), "\"2020-05-06 07:08:09.124\"") as Date
    assert.strictEqual(bare.toISOString(), "2020-05-06T07:08:09.124Z")
    const precise = decodeOne(sig("timestamp", long(12)), "\"2020-05-06 07:08:09.123456789012\"") as Date
    assert.strictEqual(precise.toISOString(), "2020-05-06T07:08:09.123Z")
    const zero = decodeOne(sig("timestamp", long(0)), "\"1969-12-31 23:59:59\"") as Date
    assert.strictEqual(zero.getTime(), -1000)
    const early = decodeOne(sig("timestamp", long(9)), "\"1969-12-31 23:59:59.9995\"") as Date
    assert.strictEqual(early.getTime(), -1)
    decodeFails(sig("timestamp"), "\"2020-05-06\"")
    decodeFails(sig("timestamp", long(3)), "\"+999999999-01-01 00:00:00.000\"")
  })

  it("decodes TIMESTAMP WITH TIME ZONE as the Date of its instant", () => {
    const region = decodeOne(sig("timestamp with time zone", long(3)), "\"2021-03-14 01:30:00.000 America/New_York\"")
    assert.strictEqual((region as Date).toISOString(), "2021-03-14T06:30:00.000Z")
    const offset = decodeOne(sig("timestamp with time zone", long(6)), "\"2021-03-14 01:30:00.000001 +05:30\"")
    assert.strictEqual((offset as Date).toISOString(), "2021-03-13T20:00:00.000Z")
    const utc = decodeOne(sig("timestamp with time zone"), "\"2021-03-14 01:30:00.000 UTC\"")
    assert.strictEqual((utc as Date).toISOString(), "2021-03-14T01:30:00.000Z")
    decodeFails(sig("timestamp with time zone"), "\"2021-03-14 01:30:00.000 Not/AZone\"")
  })

  describe("with the Effect types registry", () => {
    const types = TrinoTypes.makeEffectRegistry()
    const effect = (signature: TypeSignature, wire: string) => decodeOne(signature, wire, types)

    it("decodes DECIMAL and NUMBER into BigDecimal", () => {
      const decimal = effect(sig("decimal", long(38), long(2)), "\"123456789012345678901234567890123456.78\"")
      assert.isTrue(BigDecimal.isBigDecimal(decimal))
      assert.isTrue(
        BigDecimal.equals(
          decimal as BigDecimal.BigDecimal,
          BigDecimal.make(BigInt("12345678901234567890123456789012345678"), 2)
        )
      )
      const number = effect(sig("number"), "\"1E+10\"")
      assert.isTrue(BigDecimal.equals(number as BigDecimal.BigDecimal, BigDecimal.fromBigInt(BigInt(10_000_000_000))))
      assert.strictEqual(effect(sig("number"), "\"+Infinity\""), Number.POSITIVE_INFINITY)
      decodeFails(sig("decimal", long(5), long(1)), "\"abc\"", types)
    })

    it("decodes DATE as midnight UTC, extended years included", () => {
      const date = effect(sig("date"), "\"2024-02-29\"") as DateTime.Utc
      assert.strictEqual(DateTime.formatIso(date), "2024-02-29T00:00:00.000Z")
      const old = effect(sig("date"), "\"-0001-01-01\"") as DateTime.Utc
      assert.strictEqual(DateTime.toEpochMillis(old), new Date(Date.UTC(2000, 0, 1)).setUTCFullYear(-1, 0, 1))
      decodeFails(sig("date"), "\"2024-13-01\"", types)
    })

    it("decodes TIMESTAMP(3) as DateTime.Utc and wider precision as PreciseTimestamp", () => {
      const millis = effect(sig("timestamp", long(3)), "\"2020-05-06 07:08:09.123\"") as DateTime.Utc
      assert.strictEqual(DateTime.formatIso(millis), "2020-05-06T07:08:09.123Z")
      // without PARAMETRIC_DATETIME the server sends a bare signature
      const bare = effect(sig("timestamp"), "\"2020-05-06 07:08:09.124\"") as DateTime.Utc
      assert.strictEqual(DateTime.formatIso(bare), "2020-05-06T07:08:09.124Z")

      const precise = effect(sig("timestamp", long(12)), "\"2020-05-06 07:08:09.123456789012\"")
      assert.instanceOf(precise, TrinoTypes.PreciseTimestamp)
      if (precise instanceof TrinoTypes.PreciseTimestamp) {
        assert.strictEqual(DateTime.formatIso(precise.dateTime), "2020-05-06T07:08:09.123Z")
        assert.strictEqual(precise.picosOfMilli, 456_789_012)
      }
      const zero = effect(sig("timestamp", long(0)), "\"1969-12-31 23:59:59\"") as DateTime.Utc
      assert.strictEqual(DateTime.toEpochMillis(zero), -1000)
    })

    it("decodes TIMESTAMP WITH TIME ZONE from region and offset zones", () => {
      const region = effect(sig("timestamp with time zone", long(3)), "\"2021-03-14 01:30:00.000 America/New_York\"")
      assert.isTrue(DateTime.isDateTime(region) && DateTime.isZoned(region))
      if (DateTime.isDateTime(region) && DateTime.isZoned(region)) {
        assert.strictEqual(DateTime.formatIso(region), "2021-03-14T06:30:00.000Z")
        assert.strictEqual(DateTime.zoneToString(region.zone), "America/New_York")
      }
      const offset = effect(sig("timestamp with time zone", long(6)), "\"2021-03-14 01:30:00.000001 +05:30\"")
      assert.instanceOf(offset, TrinoTypes.PreciseTimestamp)
      if (offset instanceof TrinoTypes.PreciseTimestamp) {
        assert.strictEqual(DateTime.formatIso(offset.dateTime), "2021-03-13T20:00:00.000Z")
        assert.strictEqual(offset.picosOfMilli, 1_000_000)
      }
      const utc = effect(sig("timestamp with time zone"), "\"2021-03-14 01:30:00.000 UTC\"")
      assert.isTrue(DateTime.isDateTime(utc) && DateTime.formatIso(utc) === "2021-03-14T01:30:00.000Z")
      decodeFails(sig("timestamp with time zone"), "\"2021-03-14 01:30:00.000 Not/AZone\"", types)
    })

    it("decodes TIME and TIME WITH TIME ZONE to picoseconds of the day", () => {
      assert.deepStrictEqual(
        effect(sig("time", long(12)), "\"23:59:59.999999999999\""),
        new TrinoTypes.Time({ picosOfDay: BigInt("86399999999999999"), offsetMinutes: undefined })
      )
      assert.deepStrictEqual(
        effect(sig("time with time zone", long(0)), "\"01:02:03-08:30\""),
        new TrinoTypes.Time({ picosOfDay: BigInt(3723) * BigInt("1000000000000"), offsetMinutes: -510 })
      )
    })

    it("decodes intervals in legacy and parametric forms", () => {
      const legacy = effect(sig("interval day to second"), "\"-1 02:03:04.567\"") as Duration.Duration
      assert.strictEqual(Duration.toMillis(legacy), -(((24 + 2) * 60 + 3) * 60 + 4) * 1000 - 567)
      const precise = effect(sig("interval day to second", long(9)), "\"0 00:00:00.000000001\"") as Duration.Duration
      assert.strictEqual(Duration.toNanosUnsafe(precise), BigInt(1))
      const noFraction = effect(sig("interval day to second", long(0)), "\"3 00:00:00\"") as Duration.Duration
      assert.strictEqual(Duration.toMillis(noFraction), 3 * 86_400_000)
      assert.deepStrictEqual(
        effect(sig("interval year to month"), "\"-1-2\""),
        new TrinoTypes.IntervalYearMonth({ months: -14 })
      )
    })

    it("reaches array elements, map keys and values and row fields", () => {
      const nested = effect(
        sig(
          "row",
          named("d", sig("array", type(sig("date")))),
          named("m", sig("map", type(sig("date")), type(sig("decimal", long(5), long(1)))))
        ),
        "[[\"2020-01-02\", null], {\"2020-01-03\": \"1.5\"}]"
      ) as { d: ReadonlyArray<unknown>; m: Map<unknown, unknown> }
      assert.isTrue(DateTime.isDateTime(nested.d[0]) && DateTime.formatIso(nested.d[0]) === "2020-01-02T00:00:00.000Z")
      assert.isNull(nested.d[1])
      const [[key, value]] = [...nested.m]
      assert.isTrue(DateTime.isDateTime(key) && DateTime.formatIso(key) === "2020-01-03T00:00:00.000Z")
      assert.isTrue(BigDecimal.isBigDecimal(value))
    })
  })

  describe("registry", () => {
    it("starts empty and overrides one client's decoding only", () => {
      const types = TrinoTypes.makeRegistry()
      assert.strictEqual(decodeOne(sig("date"), "\"2024-02-29\"", types), "2024-02-29")
      types.register<number>("DATE", {
        decode: (text) => Result.succeed(Number(text.slice(0, 4)))
      })
      assert.strictEqual(decodeOne(sig("date"), "\"2024-02-29\"", types), 2024)
      assert.strictEqual(decodeOne(sig("date"), "\"2024-02-29\""), "2024-02-29")
    })

    it("hands codecs the source of a JSON number and the column's precision", () => {
      const types = TrinoTypes.makeRegistry()
      const seen: Array<readonly [string, string, number]> = []
      types.register<number>("bigint", {
        decode: (text, info) => {
          seen.push([text, info.rawType, info.precision])
          return Result.succeed(Number(text))
        }
      })
      assert.strictEqual(decodeOne(sig("bigint"), "9007199254740993", types), 9007199254740992)
      assert.deepStrictEqual(seen, [["9007199254740993", "bigint", 3]])
    })

    it("reports a codec failure as a decode failure of the column", () => {
      const types = TrinoTypes.makeRegistry()
      types.register<never>("uuid", {
        decode: (text) => Result.fail(new TrinoTypes.CodecError({ message: `bad uuid ${text}` }))
      })
      decodeFails(sig("uuid"), "\"x\"", types)
    })
  })

  it("decodes nested ARRAY, MAP and ROW values", () => {
    const array = decodeOne(sig("array", type(sig("bigint"))), "[1, null, 9007199254740993]")
    assert.deepStrictEqual(array, [BigInt(1), null, BigInt("9007199254740993")])

    const map = decodeOne(
      sig("map", type(sig("bigint")), type(sig("array", type(sig("double"))))),
      "{\"1\": [1.5], \"9007199254740993\": null}"
    )
    assert.deepStrictEqual(
      map,
      new Map<unknown, unknown>([[BigInt(1), [1.5]], [BigInt("9007199254740993"), null]])
    )

    const row = decodeOne(
      sig("row", named("id", sig("bigint")), named(undefined, sig("varchar")), named("__proto__", sig("boolean"))),
      "[7, \"x\", true]"
    )
    assert.deepStrictEqual(Object.keys(row as object), ["id", "field1", "__proto__"])
    assert.strictEqual(Object.getPrototypeOf(row), Object.prototype)
    assert.strictEqual((row as Record<string, unknown>).id, BigInt(7))
  })

  it("keeps map entries in wire order, integer-like keys included", () => {
    const map = decodeOne(
      sig("map", type(sig("bigint")), type(sig("varchar"))),
      "{\"10\": \"a\", \"2\": \"b\", \"-1\": \"c\"}"
    )
    assert.deepStrictEqual([...(map as Map<unknown, unknown>).keys()], [BigInt(10), BigInt(2), BigInt(-1)])
  })

  it("parses scalar map keys back from their string form", () => {
    const keyed = (
      keyType: TypeSignature,
      wire: string
    ) => [...(decodeOne(sig("map", type(keyType), type(sig("integer"))), wire) as Map<unknown, unknown>).keys()]
    assert.deepStrictEqual(keyed(sig("boolean"), "{\"true\": 1}"), [true])
    assert.deepStrictEqual(keyed(sig("double"), "{\"1.0E10\": 1, \"NaN\": 2}").map(String), ["10000000000", "NaN"])
    assert.deepStrictEqual(keyed(sig("varchar"), "{\"a,b\": 1}"), ["a,b"])
    assert.deepStrictEqual(keyed(sig("date"), "{\"2020-01-02\": 1}"), ["2020-01-02"])
    // ROW keys are Java List.toString() and stay strings
    assert.deepStrictEqual(keyed(sig("row", named("a", sig("integer"))), "{\"[1]\": 1}"), ["[1]"])
  })

  it("passes other types through unchanged", () => {
    const geometry = decodeOne(sig("Geometry"), "\"POINT (1 2)\"")
    assert.strictEqual(geometry, "POINT (1 2)")
    // VARIANT with the VARIANT capability is raw JSON: numbers stay JsonNumber
    const variant = decodeOne(sig("variant"), "{\"a\": [1]}") as Json.JsonValue
    assert.instanceOf(Json.asArray(Json.field(variant, "a"))?.[0], Json.JsonNumber)
  })

  it("decodes NULL at any depth and checks the row width", () => {
    const decoder = Codec.rowDecoder([column("a", sig("bigint")), column("b", sig("row", named("x", sig("date"))))])
    assert.deepStrictEqual(Result.getOrThrow(decoder.decode([null, [null]])), [null, { x: null }])
    const short = decoder.decode([null])
    assert.isTrue(Result.isFailure(short))
    if (Result.isFailure(short)) assert.isUndefined(short.failure.column)
  })

  it("reports a malformed type signature as a decode failure", () => {
    const result = Codec.rowDecoder([column("m", sig("map", type(sig("bigint"))))]).decode([{}])
    assert.isTrue(Result.isFailure(result))
    if (Result.isFailure(result)) assert.strictEqual(result.failure.column, "m")
  })
})
