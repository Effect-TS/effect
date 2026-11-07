import { assert, describe, it } from "@effect/vitest"
import * as DateTime from "effect/DateTime"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

const nanos = DateTime.unixNanoFromNanoseconds
const success = Result.getOrThrow
const failure = (
  result: Result.Result<unknown, DateTime.UnixNanoConversionError>,
  reason: DateTime.UnixNano.ConversionReason["reason"],
  direction: DateTime.UnixNano.ConversionReason["direction"],
  unit: DateTime.UnixNano.ConversionReason["unit"]
) => {
  assert.isTrue(Result.isFailure(result))
  if (Result.isFailure(result)) {
    assert.instanceOf(result.failure, DateTime.UnixNanoConversionError)
    assert.strictEqual(result.failure.reason, reason)
    assert.strictEqual(result.failure.direction, direction)
    assert.strictEqual(result.failure.unit, unit)
  }
}

describe("DateTime.UnixNano", () => {
  describe("integer quantities", () => {
    it("should preserve signed bigint nanoseconds when constructing exact instants", () => {
      for (const value of [0n, -1n, 1n, -(10n ** 100n), 10n ** 100n]) {
        assert.strictEqual(DateTime.unixNanoToNanoseconds(nanos(value)), value)
      }
    })

    it("should scale exact quantities when bigint seconds or milliseconds are supplied", () => {
      for (const value of [0n, -2n, 2n, 10n ** 100n]) {
        assert.strictEqual(success(DateTime.unixNanoFromSeconds(value)), value * 1_000_000_000n)
        assert.strictEqual(success(DateTime.unixNanoFromMilliseconds(value)), value * 1_000_000n)
      }
    })
  })

  describe("numeric quantities", () => {
    it("should preserve canonical decimal values when finite numeric quantities are supplied", () => {
      for (
        const [input, expected] of [
          [0.1, 100_000_000n],
          [-0.1, -100_000_000n],
          [1e-7, 100n],
          [1e-9, 1n],
          [-0, 0n],
          [1.23456789, 1_234_567_890n],
          [1e21, 10n ** 30n],
          [Number.MAX_VALUE, 17976931348623157n * 10n ** 301n]
        ] as const
      ) {
        assert.strictEqual(success(DateTime.unixNanoFromSeconds(input)), expected)
      }
      assert.strictEqual(success(DateTime.unixNanoFromMilliseconds(0.000001)), 1n)
      assert.strictEqual(success(DateTime.unixNanoFromMilliseconds(-1.234567)), -1_234_567n)
      assert.strictEqual(success(DateTime.unixNanoFromMilliseconds(1e21)), 10n ** 27n)
    })

    it("should enforce the selected precision when numeric quantities have subnanosecond remainders", () => {
      for (
        const [convert, unit] of [
          [DateTime.unixNanoFromSeconds, "seconds"],
          [DateTime.unixNanoFromMilliseconds, "milliseconds"]
        ] as const
      ) {
        for (const input of [Number.MIN_VALUE, -Number.MIN_VALUE]) {
          failure(convert(input), "PrecisionLoss", "toUnixNano", unit)
          assert.strictEqual(success(convert(input, { precision: "truncate" })), 0n)
        }
      }
      for (const sign of [-1, 1]) {
        failure(DateTime.unixNanoFromSeconds(sign * 1.0000000009), "PrecisionLoss", "toUnixNano", "seconds")
        assert.strictEqual(
          success(DateTime.unixNanoFromSeconds(sign * 1.0000000009, { precision: "truncate" })),
          BigInt(sign) * 1_000_000_000n
        )
        failure(DateTime.unixNanoFromMilliseconds(sign * 1.0000009), "PrecisionLoss", "toUnixNano", "milliseconds")
        assert.strictEqual(
          success(DateTime.unixNanoFromMilliseconds(sign * 1.0000009, { precision: "truncate" })),
          BigInt(sign) * 1_000_000n
        )
      }
    })

    it("should return InvalidInput when numeric quantities are invalid or require coercion", () => {
      for (const input of [NaN, Infinity, -Infinity, "1", null, undefined, {}, { valueOf: () => 1 }]) {
        failure(DateTime.unixNanoFromSeconds(input as number), "InvalidInput", "toUnixNano", "seconds")
        failure(DateTime.unixNanoFromMilliseconds(input as number), "InvalidInput", "toUnixNano", "milliseconds")
      }
    })
  })

  describe("Date and DateTime conversions", () => {
    it("should preserve a single snapshot when the input Date can change", () => {
      let reads = 0
      const date = new Date(123)
      date.getTime = () => {
        reads++
        return 123 + reads - 1
      }
      const value = success(DateTime.unixNanoFromDate(date))
      assert.strictEqual(reads, 1)
      date.setTime(999)
      assert.strictEqual(value, 123_000_000n)
    })

    it("should return InvalidInput when a Date input is invalid", () => {
      failure(DateTime.unixNanoFromDate(new Date(NaN)), "InvalidInput", "toUnixNano", "Date")
      failure(DateTime.unixNanoFromDate({} as Date), "InvalidInput", "toUnixNano", "Date")
    })

    it("should preserve instant milliseconds when converting UTC or zoned DateTime values", () => {
      const zoned = DateTime.makeZonedUnsafe(123, { timeZone: "Pacific/Auckland" })
      assert.strictEqual(success(DateTime.unixNanoFromDateTime(zoned)), 123_000_000n)
      assert.strictEqual(success(DateTime.unixNanoFromDateTime(DateTime.makeUnsafe(-123))), -123_000_000n)
      const utc = success(DateTime.unixNanoToDateTime(nanos(123_000_000n)))
      assert.isTrue(DateTime.isUtc(utc))
      assert.strictEqual(DateTime.toEpochMillis(utc), 123)
      const exact = nanos(123_000_001n)
      failure(DateTime.unixNanoToDateTime(exact), "PrecisionLoss", "fromUnixNano", "DateTime")
      const truncated = success(DateTime.unixNanoToDateTime(exact, { precision: "truncate" }))
      assert.strictEqual(DateTime.toEpochMillis(truncated), 123)
    })

    it("should return InvalidInput when DateTime instant milliseconds are malformed", () => {
      for (const milliseconds of [NaN, Infinity, -Infinity, 0.5, 8_640_000_000_000_001, -8_640_000_000_000_001]) {
        const value = Object.assign(DateTime.makeUnsafe(0), { epochMilliseconds: milliseconds })
        failure(DateTime.unixNanoFromDateTime(value), "InvalidInput", "toUnixNano", "DateTime")
      }
      failure(DateTime.unixNanoFromDateTime({} as DateTime.Utc), "InvalidInput", "toUnixNano", "DateTime")
    })

    it("should enforce original date bounds when converting exact nanoseconds", () => {
      const bound = 8_640_000_000_000_000_000_000n
      for (const sign of [-1n, 1n]) {
        const milliseconds = Number(sign * bound / 1_000_000n)
        const boundary = nanos(sign * bound)
        for (const precision of ["exact", "truncate"] as const) {
          assert.strictEqual(success(DateTime.unixNanoToDate(boundary, { precision })).getTime(), milliseconds)
          assert.strictEqual(
            DateTime.toEpochMillis(success(DateTime.unixNanoToDateTime(boundary, { precision }))),
            milliseconds
          )
        }
        assert.strictEqual(success(DateTime.unixNanoFromDate(new Date(milliseconds))), boundary)
        assert.strictEqual(success(DateTime.unixNanoFromDateTime(DateTime.makeUnsafe(milliseconds))), boundary)
      }
      for (
        const [convert, unit] of [[DateTime.unixNanoToDate, "Date"], [
          DateTime.unixNanoToDateTime,
          "DateTime"
        ]] as const
      ) {
        for (const sign of [-1n, 1n]) {
          for (const precision of ["exact", "truncate"] as const) {
            failure(convert(nanos(sign * (bound + 1n)), { precision }), "OutOfRange", "fromUnixNano", unit)
          }
          failure(convert(nanos(sign * (bound - 1n))), "PrecisionLoss", "fromUnixNano", unit)
          assert.isTrue(
            Result.isSuccess<Date | DateTime.Utc, DateTime.UnixNanoConversionError>(
              convert(nanos(sign * (bound - 1n)), { precision: "truncate" })
            )
          )
        }
        failure(convert(1 as unknown as DateTime.UnixNano), "InvalidInput", "fromUnixNano", unit)
        failure(convert(nanos(-1n)), "PrecisionLoss", "fromUnixNano", unit)
      }
      assert.strictEqual(success(DateTime.unixNanoToDate(nanos(-1n), { precision: "truncate" })).getTime(), 0)
      assert.strictEqual(
        DateTime.toEpochMillis(success(DateTime.unixNanoToDateTime(nanos(-1n), { precision: "truncate" }))),
        0
      )
      assert.strictEqual(success(DateTime.unixNanoToDate(nanos(-1_999_999n), { precision: "truncate" })).getTime(), -1)
    })

    it("should return independent Dates when converting the same instant repeatedly", () => {
      const value = nanos(123_000_000n)
      const first = success(DateTime.unixNanoToDate(value))
      const second = success(DateTime.unixNanoToDate(value))
      assert.notStrictEqual(first, second)
      first.setTime(999)
      assert.strictEqual(second.getTime(), 123)
      assert.strictEqual(value, 123_000_000n)
    })
  })

  describe("schemas", () => {
    it("should decode exact bigint values when validating unknown nanoseconds", () => {
      for (const value of [0n, -1n, 1n, -(10n ** 100n), 10n ** 100n]) {
        assert.strictEqual(success(Schema.decodeUnknownResult(Schema.UnixNano)(value)), value)
      }
      const decoded = Schema.decodeUnknownResult(Schema.UnixNano)("1")
      assert.isTrue(Result.isFailure(decoded))
      if (Result.isFailure(decoded)) assert.strictEqual(decoded.failure._tag, "SchemaError")
    })

    it("should preserve conversion errors when encoding and decoding their tagged fields", () => {
      const fields = { reason: "PrecisionLoss", direction: "fromUnixNano", unit: "DateTime" } as const
      const error = new DateTime.UnixNanoConversionError(fields)
      const encoded = Schema.encodeSync(Schema.UnixNanoConversionError)(error)
      const decoded = success(Schema.decodeUnknownResult(Schema.UnixNanoConversionError)(encoded))
      assert.instanceOf(decoded, DateTime.UnixNanoConversionError)
      assert.strictEqual(decoded.reason, "PrecisionLoss")
      assert.strictEqual(decoded.direction, "fromUnixNano")
      assert.strictEqual(decoded.unit, "DateTime")
    })

    it("should reject conversion fields when their reason, direction, or unit is unknown", () => {
      const fields = { reason: "PrecisionLoss", direction: "fromUnixNano", unit: "DateTime" } as const
      for (
        const invalid of [
          { ...fields, reason: "Other" },
          { ...fields, direction: "toUnixNanos" },
          { ...fields, unit: "minutes" }
        ]
      ) {
        assert.isTrue(Result.isFailure(Schema.decodeUnknownResult(Schema.UnixNanoConversionReason)(invalid)))
        assert.isTrue(Result.isFailure(
          Schema.decodeUnknownResult(Schema.UnixNanoConversionError)({
            ...invalid,
            _tag: "ConversionError"
          })
        ))
      }
    })

    it("should encode conversion context when a conversion returns an error", () => {
      const invalid = DateTime.unixNanoFromSeconds({} as number)
      if (Result.isFailure(invalid)) {
        assert.deepStrictEqual(Schema.encodeSync(Schema.UnixNanoConversionError)(invalid.failure), {
          _tag: "ConversionError",
          reason: "InvalidInput",
          direction: "toUnixNano",
          unit: "seconds"
        })
      } else {
        assert.fail("Expected an invalid input error")
      }
    })
  })

  describe("unexpected exceptions", () => {
    it("should propagate the original exception when reading an instant throws", () => {
      const defect = new Error("broken Date implementation")
      const date = new Date(0)
      date.getTime = () => {
        throw defect
      }
      const assertDefect = (run: () => unknown) => {
        try {
          run()
        } catch (error) {
          assert.strictEqual(error, defect)
          return
        }
        assert.fail("Expected the original defect to escape")
      }
      assertDefect(() => DateTime.unixNanoFromDate(date))
      const value = DateTime.makeUnsafe(0)
      Object.defineProperty(value, "epochMilliseconds", {
        get: () => {
          throw defect
        }
      })
      assertDefect(() => DateTime.unixNanoFromDateTime(value))
    })
  })
})
