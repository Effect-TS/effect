import { assert, describe, it } from "@effect/vitest"
import { JsonSchema, Result, Schema, SchemaRepresentation } from "effect"
import fs from "node:fs"
import path from "node:path"

const FIXTURES = path.join(import.meta.dirname, "../fixtures/json-schema-formats")

// Formats delegated to validators that already ship with Effect. Everything
// else in the suite is explicitly skipped below.
const supported = new Set(["uuid", "ipv4", "ipv6", "json-pointer"])
const skipped: Readonly<Record<string, string>> = {
  "date": "DateTime and Date parsers are too permissive for the suite (roll over invalid days)",
  "date-time": "Effect parsers reject leap seconds and accept local/no-offset forms",
  "time": "No exact time-only parser in Effect",
  "duration": "DurationFromIsoString rejects year/month forms the suite accepts",
  "uri": "URLFromString is WHATWG URL, not RFC 3986",
  "uri-reference": "URLFromString requires a base for references",
  "email": "No Effect email validator available",
  "hostname": "No Effect hostname validator available",
  "idn-email": "Not implemented",
  "idn-hostname": "Not implemented",
  "iri": "Not implemented",
  "iri-reference": "Not implemented",
  "uri-template": "Not implemented",
  "relative-json-pointer": "Not implemented",
  "regex": "Not implemented",
  "color": "Non-standard format",
  "unknown": "Unknown format stays annotation-only",
  "ip-address": "Non-standard format"
}

const decode = (codec: any, value: unknown) =>
  Result.isSuccess(Schema.decodeUnknownResult(codec, { errors: "first" })(value))

interface SuiteCase {
  readonly description: string
  readonly data: unknown
  readonly valid: boolean
}
interface SuiteGroup {
  readonly description: string
  readonly tests: ReadonlyArray<SuiteCase>
}

describe("JSON Schema format suite", () => {
  for (const [format, reason] of Object.entries(skipped)) {
    it.skip(`${format} (${reason})`, () => {})
  }
  const files = [...supported].sort().map((format) => `format-${format}.json`)
  for (const file of files) {
    const format = file.replace(/^format-/, "").replace(/\.json$/, "")
    it(`enforces ${format}`, () => {
      const suite = JSON.parse(fs.readFileSync(path.join(FIXTURES, file), "utf8")) as {
        readonly tests: ReadonlyArray<SuiteGroup>
      }
      const codec = Schema.make(
        SchemaRepresentation.fromJsonSchemaDocument(
          JsonSchema.fromSchemaDraft2020_12({
            type: "object",
            properties: { value: { type: "string", format } },
            required: ["value"],
            additionalProperties: false
          }),
          { formats: "apply" }
        ).ast
      ) as any
      let checked = 0
      for (const group of suite.tests) {
        if (/annotation/i.test(group.description)) continue
        for (const testCase of group.tests) {
          if (/annotation/i.test(testCase.description)) continue
          // JSON Schema formats ignore non-string data.
          if (typeof testCase.data !== "string") continue
          checked++
          assert.strictEqual(
            decode(codec, { value: testCase.data }),
            testCase.valid,
            `${format}: ${testCase.description} (${JSON.stringify(testCase.data)})`
          )
        }
      }
      assert.isAbove(checked, 0)
    })
  }

  it("keeps format annotation-only by default", () => {
    const codec = Schema.make(
      SchemaRepresentation.fromJsonSchemaDocument(
        JsonSchema.fromSchemaDraft2020_12({ type: "string", format: "date-time" })
      ).ast
    ) as any
    assert.isTrue(decode(codec, "broken-timestamp"))
  })
})
