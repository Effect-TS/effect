import { pipe } from "effect/Function"
import * as Number from "effect/Number"
import * as String from "effect/String"
import * as Struct from "effect/Struct"

describe.concurrent("Struct", () => {
  it("exports", () => {
    expect(Struct.getOrder).exist
  })

  it("pick", () => {
    expect(pipe({ a: "a", b: 1, c: true }, Struct.pick("a", "b"))).toEqual({ a: "a", b: 1 })
  })

  it("omit", () => {
    expect(pipe({ a: "a", b: 1, c: true }, Struct.omit("c"))).toEqual({ a: "a", b: 1 })
  })

  it("evolve", () => {
    const res1 = pipe(
      { a: "a", b: 1, c: true, d: "extra" },
      Struct.evolve({
        a: (s) => s.length,
        b: (b) => b > 0,
        c: (c) => !c
      })
    )

    expect(res1).toEqual({ a: 1, b: true, c: false, d: "extra" })

    const x: Record<"b", number> = Object.create({ a: 1 })
    x.b = 1
    const res2 = pipe(x, Struct.evolve({ b: (b) => b > 0 }))

    expect(res2).toEqual({ b: true })

    // dual
    const res3 = Struct.evolve({ a: 1 }, { a: (x) => x > 0 })
    expect(res3).toEqual({ a: true })
  })

  it("struct", () => {
    const PersonEquivalence = Struct.getEquivalence({
      name: String.Equivalence,
      age: Number.Equivalence
    })

    assert.deepStrictEqual(
      PersonEquivalence({ name: "John", age: 25 }, { name: "John", age: 25 }),
      true
    )
    assert.deepStrictEqual(
      PersonEquivalence({ name: "John", age: 25 }, { name: "John", age: 40 }),
      false
    )
  })
})
