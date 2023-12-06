import * as S from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import { Effect, Exit } from "effect"
import { assert, describe, test } from "vitest"

class Person extends S.Class<Person>()({
  id: S.number,
  name: S.string.pipe(S.nonEmpty())
}) {}

class GetPersonById extends S.Class<GetPersonById>()({
  id: S.number
}) {
  get [Serializable.symbol]() {
    return GetPersonById
  }
  get [Serializable.symbolResult]() {
    return {
      Success: Person,
      Failure: S.string
    } as const
  }
}

describe("Serializable", () => {
  test("serialize", () => {
    const req = new GetPersonById({ id: 123 })
    assert.deepStrictEqual(Effect.runSync(Serializable.serialize(req)), {
      id: 123
    })
  })

  test("deserialize", () => {
    const req = new GetPersonById({ id: 123 })
    assert.deepStrictEqual(
      Effect.runSync(Serializable.deserialize(req, {
        id: 456
      })),
      new GetPersonById({ id: 456 })
    )
  })

  test("serializeFailure", () => {
    const req = new GetPersonById({ id: 123 })
    assert.deepStrictEqual(
      Effect.runSync(
        Serializable.serializeFailure(req, "fail")
      ),
      "fail"
    )
  })

  test("serializeSuccess", () => {
    const req = new GetPersonById({ id: 123 })
    assert.deepStrictEqual(
      Effect.runSync(
        Serializable.serializeSuccess(req, new Person({ id: 123, name: "foo" }))
      ),
      { id: 123, name: "foo" }
    )
  })

  test("serializeExit", () => {
    const req = new GetPersonById({ id: 123 })
    assert.deepStrictEqual(
      Effect.runSync(
        Serializable.serializeExit(req, Exit.succeed(new Person({ id: 123, name: "foo" })))
      ),
      { _tag: "Success", value: { id: 123, name: "foo" } }
    )
    assert.deepStrictEqual(
      Effect.runSync(
        Serializable.serializeExit(req, Exit.fail("fail"))
      ),
      { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } }
    )
  })

  test("deserializeFailure", () => {
    const req = new GetPersonById({ id: 123 })
    assert.deepStrictEqual(
      Effect.runSync(
        Serializable.deserializeFailure(req, "fail")
      ),
      "fail"
    )
  })

  test("deserializeSuccess", () => {
    const req = new GetPersonById({ id: 123 })
    assert.deepStrictEqual(
      Effect.runSync(
        Serializable.deserializeSuccess(req, { id: 123, name: "foo" })
      ),
      new Person({ id: 123, name: "foo" })
    )
  })

  test("deserializeExit", () => {
    const req = new GetPersonById({ id: 123 })
    assert.deepStrictEqual(
      Effect.runSync(
        Serializable.deserializeExit(req, { _tag: "Success", value: { id: 123, name: "foo" } })
      ),
      Exit.succeed(new Person({ id: 123, name: "foo" }))
    )
    assert.deepStrictEqual(
      Effect.runSync(
        Serializable.deserializeExit(req, {
          _tag: "Failure",
          cause: { _tag: "Fail", error: "fail" }
        })
      ),
      Exit.fail("fail")
    )
  })
})
