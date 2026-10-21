import { describe, it } from "@effect/vitest"
import { assertNone, assertSome, assertTrue, deepStrictEqual, doesNotThrow, strictEqual } from "@effect/vitest/utils"
import { DateTime, Duration, Redacted, Result, Schema } from "effect"
import { Headers } from "effect/http"
import { assertSuccess, throws } from "../utils/assert.ts"

describe("Headers", () => {
  describe("Schema.Headers", () => {
    it("serializer annotation", () => {
      const _Accept = Schema.toIso(Schema.Headers).at("Accept")
      const headers = Headers.fromRecordUnsafe({
        "Accept": "application/json, text/plain, */*",
        "Cache-Control": "no-cache"
      })
      assertSuccess(_Accept.getResult(headers), "application/json, text/plain, */*")
      assertSuccess(
        _Accept.replaceResult("application/json", headers),
        Headers.fromRecordUnsafe({
          "accept": "application/json",
          "cache-control": "no-cache"
        })
      )
    })
  })

  it("does not expose inspectable prototype methods during for..in iteration", () => {
    const headers = Headers.fromInput({ foo: "bar" })
    const keys: Array<string> = []

    for (const key in headers) {
      keys.push(key)
    }

    deepStrictEqual(keys, ["foo"])
  })

  it("remove", () => {
    const headers = Headers.fromInput({ foo: "bar", baz: "qux", hello: "world" })
    const result = Headers.remove(headers, "baz")
    deepStrictEqual({ ...result }, { foo: "bar", hello: "world" })
  })

  it("removeMany deletes multiple headers", () => {
    const headers = Headers.fromInput({ foo: "bar", baz: "qux", hello: "world" })
    const result = Headers.removeMany(headers, ["baz", "hello"])
    deepStrictEqual({ ...result }, { foo: "bar" })
  })

  it("removeMany normalizes keys to lowercase", () => {
    const headers = Headers.fromInput({ "Content-Type": "text/plain", "X-Custom": "value", keep: "me" })
    const result = Headers.removeMany(headers, ["Content-Type", "X-CUSTOM"])
    deepStrictEqual({ ...result }, { keep: "me" })
  })

  it("isRedactedName compares string patterns case-insensitively", () => {
    strictEqual(Headers.isRedactedName("Authorization", ["authorization"]), true)
  })

  it("works with for..in based headers polyfills", () => {
    const effectHeaders = Headers.fromInput({ foo: "bar" })
    const nativeHeaders = new globalThis.Headers()

    doesNotThrow(() => {
      for (const key in effectHeaders) {
        nativeHeaders.append(key, effectHeaders[key])
      }
    })

    strictEqual(nativeHeaders.get("foo"), "bar")
  })

  it("get returns Option", () => {
    const headers = Headers.fromInput({ foo: "bar" })
    assertSome(Headers.get(headers, "foo"), "bar")
    assertNone(Headers.get(headers, "missing"))
  })

  it("redacts each header independently with a global pattern", () => {
    const result = Headers.redact(
      Headers.fromInput({ "x-secret-one": "one", "x-secret-two": "two" }),
      /^x-secret-/g
    )

    assertTrue(Redacted.isRedacted(result["x-secret-one"]))
    assertTrue(Redacted.isRedacted(result["x-secret-two"]))
  })

  it("checks each header independently with a sticky pattern", () => {
    const pattern = /^x-secret-/y

    assertTrue(Headers.isRedactedName("x-secret-one", [pattern]))
    assertTrue(Headers.isRedactedName("x-secret-two", [pattern]))
  })

  it("preserves caller-owned stateful pattern cursors", () => {
    const redactPattern = /^x-secret/g
    const namePattern = /^x-secret/y
    redactPattern.lastIndex = 3
    namePattern.lastIndex = 4

    Headers.redact(Headers.fromInput({ "x-secret": "value" }), redactPattern)
    Headers.isRedactedName("x-secret", [namePattern])

    strictEqual(redactPattern.lastIndex, 3)
    strictEqual(namePattern.lastIndex, 4)
  })
})

// 1994-11-06T08:49:37Z, the example date of RFC 9110 §5.6.7
const httpDateMillis = 784_111_777_000

const withTimeZone = <A>(timeZone: string, body: () => A): A => {
  const previous = process.env.TZ
  process.env.TZ = timeZone
  try {
    return body()
  } finally {
    if (previous === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = previous
    }
  }
}

describe("HttpDate", () => {
  it("parses every RFC 9110 format as UTC, whatever the process time zone", () => {
    withTimeZone("America/New_York", () => {
      for (
        const input of [
          "Sun, 06 Nov 1994 08:49:37 GMT",
          "Sunday, 06-Nov-94 08:49:37 GMT",
          "Sun Nov  6 08:49:37 1994"
        ]
      ) {
        const date = Result.getOrThrow(Headers.parseHttpDate(input))
        strictEqual(DateTime.toEpochMillis(date), httpDateMillis, input)
      }
    })
  })

  it("rejects values that are not HTTP dates", () => {
    for (const input of ["1994-11-06T08:49:37Z", "120", "", "Sun, 06 Nov 1994 08:49:37 PST"]) {
      const result = Headers.parseHttpDate(input)
      assertTrue(Result.isFailure(result) && result.failure.reason._tag === "InvalidHttpDate", input)
    }
  })

  it("formats as IMF-fixdate", () => {
    strictEqual(Headers.formatHttpDate(DateTime.makeUnsafe(httpDateMillis)), "Sun, 06 Nov 1994 08:49:37 GMT")
  })

  it("Schema.DateTimeUtcFromHttpDate decodes any format and encodes IMF-fixdate", () => {
    const decoded = Schema.decodeSync(Schema.DateTimeUtcFromHttpDate)("Sun Nov  6 08:49:37 1994")
    strictEqual(DateTime.toEpochMillis(decoded), httpDateMillis)
    strictEqual(Schema.encodeSync(Schema.DateTimeUtcFromHttpDate)(decoded), "Sun, 06 Nov 1994 08:49:37 GMT")
    throws(() => Schema.decodeSync(Schema.DateTimeUtcFromHttpDate)("tomorrow"))
  })
})

describe("RetryAfter", () => {
  it("parses whole seconds", () => {
    const value = Result.getOrThrow(Headers.parseRetryAfter("120"))
    strictEqual(value._tag, "Seconds")
    if (value._tag === "Seconds") {
      strictEqual(value.seconds, 120)
    }
    strictEqual(Headers.formatRetryAfter(value), "120")
  })

  it("parses an HTTP date", () => {
    const value = Result.getOrThrow(Headers.parseRetryAfter("Sun Nov  6 08:49:37 1994"))
    strictEqual(value._tag, "Date")
    if (value._tag === "Date") {
      strictEqual(DateTime.toEpochMillis(value.date), httpDateMillis)
    }
    strictEqual(Headers.formatRetryAfter(value), "Sun, 06 Nov 1994 08:49:37 GMT")
  })

  it("rejects negative, fractional, exponent and non-finite seconds", () => {
    for (const input of ["-5", "1.5", "1e3", "Infinity", "", "soon"]) {
      const result = Headers.parseRetryAfter(input)
      assertTrue(Result.isFailure(result) && result.failure.reason._tag === "InvalidRetryAfter", input)
    }
  })

  it("delay is measured from now and never negative", () => {
    const seconds = Result.getOrThrow(Headers.parseRetryAfter("120"))
    strictEqual(Duration.toMillis(Headers.retryAfterDelay(seconds, httpDateMillis)), 120_000)
    const date = Result.getOrThrow(Headers.parseRetryAfter("Sun, 06 Nov 1994 08:49:37 GMT"))
    strictEqual(Duration.toMillis(Headers.retryAfterDelay(date, httpDateMillis - 30_000)), 30_000)
    strictEqual(Duration.toMillis(Headers.retryAfterDelay(date, httpDateMillis + 30_000)), 0)
  })

  it("Schema.RetryAfterFromString round trips and rejects invalid values", () => {
    const decoded = Schema.decodeSync(Schema.RetryAfterFromString)("120")
    strictEqual(decoded._tag, "Seconds")
    strictEqual(Schema.encodeSync(Schema.RetryAfterFromString)(decoded), "120")
    throws(() => Schema.decodeSync(Schema.RetryAfterFromString)("-5"))
  })
})
