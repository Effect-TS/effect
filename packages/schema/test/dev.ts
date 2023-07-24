import * as Equal from "@effect/data/Equal"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("dev", () => {
  it.skip("union/optional property signatures: should return the best output", async () => {
    const ab = S.struct({ a: S.string, b: S.optional(S.number) })
    const ac = S.struct({ a: S.string, c: S.optional(S.number) })
    const schema = S.union(ab, ac)
    await Util.expectParseSuccess(
      schema,
      { a: "a", c: 1 },
      { a: "a" }
    )
  })

  it("data", () => {
    const schema = S.data(S.struct({
      name: S.string,
      age: S.number
    }))

    const person1 = S.decode(schema)({ name: "Alice", age: 30 })
    const person2 = S.decode(schema)({ name: "Alice", age: 30 })

    expect(Equal.equals(person1, person2)).toBe(true)
  })
})
