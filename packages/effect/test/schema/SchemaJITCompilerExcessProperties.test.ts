import { describe, it } from "@effect/vitest"
import { Schema, SchemaParser } from "effect"
// oxlint-disable-next-line no-unassigned-import
import "effect/schema/SchemaJITCompiler/enable"
import { assertSchemaIssueError, deepStrictEqual, throws } from "../utils/assert.ts"

const strict = { onExcessProperty: "error" } as const

describe("SchemaJITCompiler excess properties", () => {
  it("ignores non-enumerable own properties", () => {
    const schema = Schema.Struct({ a: Schema.String })
    const decode = SchemaParser.decodeUnknownSync(schema, strict)
    const sym = Symbol("sym")
    const input: Record<PropertyKey, unknown> = { a: "a" }
    Object.defineProperty(input, "stack", { value: "stack", enumerable: false })
    Object.defineProperty(input, sym, { value: "sym", enumerable: false })
    deepStrictEqual(decode(input), { a: "a" })
  })

  it("rejects enumerable excess properties", () => {
    const schema = Schema.Struct({ a: Schema.String })
    const decode = SchemaParser.decodeUnknownSync(schema, strict)
    throws(
      () => decode({ a: "a", b: "b" }),
      (error) => {
        assertSchemaIssueError(error, `Expected no excess property\n  at ["b"]`)
      }
    )
  })

  it("encodes tagged errors carrying runtime internals", () => {
    class NotFound extends Schema.TaggedError<NotFound>()("NotFound", { id: Schema.Number }) {}
    const encode = SchemaParser.encodeUnknownSync(NotFound, strict)
    deepStrictEqual(encode(new NotFound({ id: 1 })), { _tag: "NotFound", id: 1 })
  })
})
