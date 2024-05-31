import { Schema } from "@effect/schema"

const schema = Schema.Struct({
  a: Schema.propertySignature(Schema.String).annotations({})
})

// $ExpectType typeof String$
schema.fields.a.schema
