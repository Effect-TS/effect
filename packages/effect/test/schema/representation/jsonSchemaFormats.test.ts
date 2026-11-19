import { assert, describe, it } from "@effect/vitest"
import { JsonSchema, Result, Schema, SchemaRepresentation } from "effect"

const decode = (format: string, value: unknown) => {
  const json = {
    type: "object",
    properties: { value: { type: "string", format } },
    required: ["value"],
    additionalProperties: false
  }
  const codec = Schema.make(
    SchemaRepresentation.fromJsonSchemaDocument(
      JsonSchema.fromSchemaDraft2020_12(json),
      { patterns: "apply" }
    ).ast
  ) as any
  return Result.isSuccess(Schema.decodeUnknownResult(codec, { errors: "first" })({ value }))
}

const formats: ReadonlyArray<{
  readonly format: string
  readonly valid: ReadonlyArray<string>
  readonly invalid: ReadonlyArray<string>
}> = [
  {
    format: "date-time",
    valid: ["2024-01-01T12:30:00Z", "2024-01-01T12:30:00.123+05:30"],
    invalid: ["broken-timestamp", "2024-02-30T12:30:00Z", "2024-01-01 12:30:00Z"]
  },
  { format: "date", valid: ["2024-01-01", "2000-02-29"], invalid: ["2024-02-30", "01/01/2024"] },
  { format: "time", valid: ["12:30:00", "12:30:00.5Z", "23:59:59+01:00"], invalid: ["25:00:00", "12:30"] },
  { format: "duration", valid: ["P1Y2M3DT4H5M6S", "PT0.5S"], invalid: ["P", "1Y2M"] },
  {
    format: "email",
    valid: ["a@example.com", "first.last+tag@sub.example.org"],
    invalid: ["not-an-email", "a@localhost"]
  },
  { format: "hostname", valid: ["example.com", "a-b.example.org"], invalid: ["-bad.example.com", "bad_.com"] },
  { format: "ipv4", valid: ["192.168.0.1", "0.0.0.0"], invalid: ["256.1.1.1", "1.2.3"] },
  { format: "ipv6", valid: ["2001:db8::1", "::1"], invalid: ["2001:db8:::1", "not-ipv6"] },
  { format: "uri", valid: ["https://example.com/x", "urn:isbn:0451450523"], invalid: ["not a uri", "/relative"] },
  {
    format: "uuid",
    valid: ["123e4567-e89b-12d3-a456-426614174000"],
    invalid: ["not-a-uuid", "123e4567e89b12d3a456426614174000"]
  },
  { format: "json-pointer", valid: ["", "/foo/bar", "/a~1b"], invalid: ["foo", "/a~2b"] },
  { format: "relative-json-pointer", valid: ["0", "1/foo", "0#"], invalid: ["-1", "a/b"] },
  { format: "regex", valid: ["^[a-z]+$"], invalid: ["["] }
]

describe("JSON Schema format enforcement", () => {
  for (const { format, valid, invalid } of formats) {
    it(`enforces ${format}`, () => {
      for (const value of valid) {
        assert.isTrue(decode(format, value), `${format}: expected ${value} to be valid`)
      }
      for (const value of invalid) {
        assert.isFalse(decode(format, value), `${format}: expected ${value} to be invalid`)
      }
    })
  }

  it("keeps unknown formats annotation-only", () => {
    assert.isTrue(decode("custom-format", "anything"))
  })
})
