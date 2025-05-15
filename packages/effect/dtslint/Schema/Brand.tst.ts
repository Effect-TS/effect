/* eslint-disable @typescript-eslint/no-unused-vars */
import { pipe, Schema } from "effect"
import { describe, it } from "tstyche"

const Int1 = Symbol.for("Int")
const Int2 = Symbol.for("Int")

const schema1 = pipe(Schema.Number, Schema.int(), Schema.brand(Int1))
const schema2 = pipe(Schema.Number, Schema.int(), Schema.brand(Int2))

type A1 = Schema.Schema.Type<typeof schema1>
type A2 = Schema.Schema.Type<typeof schema2>

declare const a2: A2
declare const f: (int: A1) => void

describe("SchemaBrand", () => {
  it("We should only have one error for the missing definition", () => {
    // @ts-expect-error
    f(a2)
  })
})
