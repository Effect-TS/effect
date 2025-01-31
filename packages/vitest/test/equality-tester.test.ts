import { describe, expect, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Data from "effect/Data"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"

describe("toMatchObject", () => {
  it("plain objects", () => {
    expect({ a: 1, b: 2 }).toMatchObject({ a: 1 })
  })

  it("Data.struct", () => {
    const alice = Data.struct({ name: "Alice", age: 30 })

    expect(alice).toMatchObject(Data.struct({ name: "Alice" }))
  })

  it("option", () => {
    expect(Option.some({ a: 1, b: 2 })).toMatchObject(Option.some({ a: 1 }))
    expect(Option.none()).toMatchObject(Option.none())
    expect({ x: Option.some({ a: 1, b: 2 }), y: Option.none() }).toMatchObject({ x: Option.some({ a: 1 }) })

    expect(Option.none()).not.toMatchObject(Option.some({ a: 1 }))
    expect(Option.some({ b: 1 })).not.toMatchObject(Option.some({ a: 1 }))
    expect({ x: Option.some({ a: 1, b: 2 }), y: Option.none() }).not.toMatchObject({ x: Option.some({ b: 1 }) })
    expect({ x: Option.none(), y: Option.none() }).not.toMatchObject({ x: Option.some({}) })
  })

  it("either", () => {
    expect(Either.right({ a: 1, b: 2 })).toMatchObject(Either.right({ a: 1 }))
    expect(Either.left({ a: 1, b: 2 })).toMatchObject(Either.left({ a: 1 }))

    expect(Either.right({ a: 1, b: 2 })).not.toMatchObject(Either.left({ a: 1 }))
    expect(Either.left({ a: 1, b: 2 })).not.toMatchObject(Either.right({ a: 1 }))
  })

  it("either", () => {
    expect(Either.right({ a: 1, b: 2 })).toMatchObject(Either.right({ a: 1 }))
    expect(Either.left({ a: 1, b: 2 })).toMatchObject(Either.left({ a: 1 }))

    expect(Either.right({ a: 1, b: 2 })).not.toMatchObject(Either.left({ a: 1 }))
    expect(Either.left({ a: 1, b: 2 })).not.toMatchObject(Either.right({ a: 1 }))
  })
})

describe.each(["toStrictEqual", "toEqual"] as const)("%s", (matcher) => {
  it("either", () => {
    expect(Either.right(1))[matcher](Either.right(1))
    expect(Either.left(1))[matcher](Either.left(1))

    expect(Either.right(2)).not[matcher](Either.right(1))
    expect(Either.left(2)).not[matcher](Either.left(1))
    expect(Either.left(1)).not[matcher](Either.right(1))
    expect(Either.left(1)).not[matcher](Either.right(2))
  })

  it("exit", () => {
    expect(Exit.succeed(1))[matcher](Exit.succeed(1))
    expect(Exit.fail("failure"))[matcher](Exit.fail("failure"))
    expect(Exit.die("defect"))[matcher](Exit.die("defect"))

    expect(Exit.succeed(1)).not[matcher](Exit.succeed(2))
    expect(Exit.fail("failure")).not[matcher](Exit.fail("failure1"))
    expect(Exit.die("failure")).not[matcher](Exit.fail("failure1"))
    expect(Exit.die("failure")).not[matcher](Exit.fail("failure1"))
    expect(Exit.failCause(Cause.sequential(Cause.fail("f1"), Cause.fail("f2")))).not[matcher](
      Exit.failCause(Cause.sequential(Cause.fail("f1"), Cause.fail("f3")))
    )
  })

  it("option", () => {
    expect(Option.some(2))[matcher](Option.some(2))
    expect(Option.none())[matcher](Option.none())

    expect(Option.some(2)).not[matcher](Option.some(1))
    expect(Option.none()).not[matcher](Option.some(1))
  })
})
