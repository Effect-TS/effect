import { assert, it } from "@effect/vitest"
import { Effect, Schema, SchemaAST, SchemaParser } from "effect"
import { SchemaJITCompiler } from "effect/schema"

it.effect("re-running a compiled Struct makeEffect keeps earlier results intact", () =>
  Effect.gen(function*() {
    // makeObjectBase (src/schema/SchemaCompiler/runtime.ts:67-81) resumes into one captured ObjectParserState and
    // returns its `out`. SchemaParser.makeEffect promises a freshly constructed value per run, including child
    // defaults (SchemaCompiler.ts:134, :181), so an earlier result must not change when the Effect runs again.
    let n = 0
    const schema = Schema.Struct({
      id: Schema.Number.pipe(Schema.withConstructorDefault(Effect.sync(() => ++n)))
    })
    SchemaJITCompiler.enable(SchemaAST.toType(schema.ast))
    const program = SchemaParser.makeEffect(schema)({})
    const first = yield* program
    const second = yield* program
    assert.deepStrictEqual([first, second], [{ id: 1 }, { id: 2 }])
  }))
