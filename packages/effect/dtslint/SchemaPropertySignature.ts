import { Schema } from "effect"

// $ExpectType propertySignature<typeof String$>
const A = Schema.propertySignature(Schema.String)

// $ExpectType propertySignature<typeof String$>
const AA = A.annotations({})

// $ExpectType optional<typeof Number$>
const B = Schema.optional(Schema.Number)

// $ExpectType optional<typeof Number$>
const BB = B.annotations({})

// $ExpectType optionalWith<typeof Boolean$, { exact: true; }>
const C = Schema.optionalWith(Schema.Boolean, { exact: true })

// $ExpectType optionalWith<typeof Boolean$, { exact: true; }>
const CC = C.annotations({})

const schema = Schema.Struct({
  a: AA,
  b: BB,
  c: CC
})

// $ExpectType typeof String$
schema.fields.a.from

// $ExpectType typeof Number$
schema.fields.b.from

// $ExpectType typeof Boolean$
schema.fields.c.from
