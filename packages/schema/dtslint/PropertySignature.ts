import { Schema } from "@effect/schema"

// $ExpectType propertySignature<typeof String$>
const A = Schema.propertySignature(Schema.String).annotations({})

// $ExpectType optional<typeof Number$>
const B = Schema.optional(Schema.Number).annotations({})

// $ExpectType optionalWithOptions<typeof Boolean$, { exact: true; }>
const C = Schema.optional(Schema.Boolean, { exact: true }).annotations({})

const schema = Schema.Struct({
  a: A,
  b: B,
  c: C
})

// $ExpectType typeof String$
schema.fields.a.schema

// $ExpectType typeof Number$
schema.fields.b.schema

// $ExpectType typeof Boolean$
schema.fields.c.schema
