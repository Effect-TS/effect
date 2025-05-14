import { pipe, Schema } from "effect"
import { describe, expect, it } from "tstyche"

const Int1 = Symbol.for("Int")
const Int2 = Symbol.for("Int")

const schema1 = pipe(Schema.Number, Schema.int(), Schema.brand(Int1))
const schema2 = pipe(Schema.Number, Schema.int(), Schema.brand(Int2))

type A1 = Schema.Schema.Type<typeof schema1>
type A2 = Schema.Schema.Type<typeof schema2>

describe("SchemaBrand", () => {
  it("should differentiate between branded schema types", () => {
    expect<A1>().type.not.toBeAssignableTo<A2>()
    expect<A2>().type.not.toBeAssignableTo<A1>()
  })
})
