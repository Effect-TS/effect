import { describe, test } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { Effect, Exit } from "effect"
import * as S from "effect/Schema"

class Person extends S.Class<Person>("Person")({
  id: S.Number,
  name: S.String
}) {}

class GetPersonById extends S.Class<GetPersonById>("GetPersonById")({
  id: S.Number
}) {
  get [S.symbolSerializable]() {
    return GetPersonById
  }
  get [S.symbolWithResult]() {
    return {
      success: Person,
      failure: S.String,
      defect: S.Defect
    }
  }
}

describe("Serializable", () => {
  test("serialize", () => {
    const req = new GetPersonById({ id: 123 })
    deepStrictEqual(Effect.runSync(S.serialize(req)), {
      id: 123
    })
  })

  test("deserialize", () => {
    const req = new GetPersonById({ id: 123 })
    deepStrictEqual(
      Effect.runSync(S.deserialize(req, {
        id: 456
      })),
      new GetPersonById({ id: 456 })
    )
  })

  test("serializeFailure", () => {
    const req = new GetPersonById({ id: 123 })
    deepStrictEqual(
      Effect.runSync(
        S.serializeFailure(req, "fail")
      ),
      "fail"
    )
  })

  test("serializeSuccess", () => {
    const req = new GetPersonById({ id: 123 })
    deepStrictEqual(
      Effect.runSync(
        S.serializeSuccess(req, new Person({ id: 123, name: "foo" }))
      ),
      { id: 123, name: "foo" }
    )
  })

  test("serializeExit", () => {
    const req = new GetPersonById({ id: 123 })
    deepStrictEqual(
      Effect.runSync(
        S.serializeExit(req, Exit.succeed(new Person({ id: 123, name: "foo" })))
      ),
      { _tag: "Success", value: { id: 123, name: "foo" } }
    )
    deepStrictEqual(
      Effect.runSync(
        S.serializeExit(req, Exit.fail("fail"))
      ),
      { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } }
    )
  })

  test("deserializeFailure", () => {
    const req = new GetPersonById({ id: 123 })
    deepStrictEqual(
      Effect.runSync(
        S.deserializeFailure(req, "fail")
      ),
      "fail"
    )
  })

  test("deserializeSuccess", () => {
    const req = new GetPersonById({ id: 123 })
    deepStrictEqual(
      Effect.runSync(
        S.deserializeSuccess(req, { id: 123, name: "foo" })
      ),
      new Person({ id: 123, name: "foo" })
    )
  })

  test("deserializeExit", () => {
    const req = new GetPersonById({ id: 123 })
    deepStrictEqual(
      Effect.runSync(
        S.deserializeExit(req, { _tag: "Success", value: { id: 123, name: "foo" } })
      ),
      Exit.succeed(new Person({ id: 123, name: "foo" }))
    )
    deepStrictEqual(
      Effect.runSync(
        S.deserializeExit(req, {
          _tag: "Failure",
          cause: { _tag: "Fail", error: "fail" }
        })
      ),
      Exit.fail("fail")
    )
  })
})
