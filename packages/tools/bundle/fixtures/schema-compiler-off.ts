import * as Schema from "effect/Schema"
import * as SchemaParser from "effect/SchemaParser"

const schema = Schema.Struct({
  first: Schema.FiniteFromString,
  second: Schema.FiniteFromString
})

console.log(SchemaParser.decodeUnknownSync(schema)({ first: "1", second: "2" }))
