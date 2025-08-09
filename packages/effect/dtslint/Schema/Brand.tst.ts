/* eslint-disable @typescript-eslint/no-unused-vars */
import { pipe, Schema } from "effect"
import { describe, expect, it, when } from "tstyche"

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

  it("should raise an error when the brand is not assignable to the schema", () => {
    when(pipe).isCalledWith(
      Schema.Number,
      expect(Schema.brand).type.not.toBeCallableWith("UserId", {
        examples: ["a"]
      })
    )
  })

  it("should not override types with any when extracted into a constant", () => {
    const UserIdBrandSchema = Schema.brand("UserId")

    const UserIdSchema = pipe(Schema.Number, UserIdBrandSchema)

    type IUserId = Schema.Schema.Type<typeof UserIdSchema>

    type IsAny<T> = 0 extends 1 & T ? true : false

    expect<IsAny<IUserId>>().type.toBe<false>()
    expect<IUserId>().type.toBeAssignableTo<number>()
  })
})
