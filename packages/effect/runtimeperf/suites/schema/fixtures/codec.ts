import * as Schema from "effect/Schema"
import { enable } from "effect/schema/SchemaJITCompiler"
import * as SchemaParser from "effect/SchemaParser"
import assert from "node:assert/strict"

const fixture = (jit: boolean) => {
  const schema = Schema.Array(Schema.toCodecStringTree(Schema.Struct({
    name: Schema.String,
    id: Schema.Number,
    ok: Schema.Boolean,
    score: Schema.optionalKey(Schema.Number)
  })))
  if (jit) enable(schema.ast)
  const decode = SchemaParser.decodeUnknownSync(schema)
  const expected = Array.from({ length: 1000 }, (_, index) => ({
    name: `row${index}`,
    id: index,
    ok: index % 2 === 0,
    ...(index % 3 === 0 ? {} : { score: index / 2 })
  }))
  const input = expected.map((row) => ({
    name: row.name,
    id: String(row.id),
    ok: String(row.ok),
    ...(row.score === undefined ? {} : { score: String(row.score) })
  }))
  return {
    run: () => decode(input),
    validate: (result: unknown) => assert.deepEqual(result, expected)
  }
}

export const stringTreeStructInterpreted = () => fixture(false)
export const stringTreeStructJit = () => fixture(true)
