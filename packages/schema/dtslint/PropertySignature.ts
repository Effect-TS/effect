import { Schema } from "@effect/schema"

const schema = Schema.Struct({
  a: Schema.propertySignature(Schema.String).annotations({}),
  b: Schema.optional(Schema.Number).annotations({})
})

// $ExpectType typeof String$
schema.fields.a.schema

// $ExpectType typeof Number$
schema.fields.b.schema
