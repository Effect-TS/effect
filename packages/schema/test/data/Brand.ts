import * as B from "@effect/data/Brand"
import { pipe } from "@fp-ts/core/Function"
import * as _ from "@fp-ts/schema/data/Brand"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

type Int = number & B.Brand<"Int">
const Int = B.refined<Int>(
  (n) => Number.isInteger(n),
  (n) => B.error(`Expected ${n} to be an integer`)
)

type Positive = number & B.Brand<"Positive">
const Positive = B.refined<Positive>(
  (n) => n > 0,
  (n) => B.error(`Expected ${n} to be positive`)
)

type PositiveInt = Positive & Int
const PositiveInt = B.all(Int, Positive)

type Eur = number & B.Brand<"Eur">
const Eur = B.nominal<Eur>()

describe.concurrent("Brand", () => {
  it("property tests", () => {
    Util.property(_.brand(Int)(S.number)) // refined
    Util.property(_.brand(Eur)(S.number)) // nominal
  })

  it("refined", () => {
    const schema = pipe(S.number, _.brand(B.all(Positive, Int)))

    Util.expectDecodingFailure(
      schema,
      -0.5,
      "Expected -0.5 to be positive, Expected -0.5 to be an integer"
    )
    Util.expectDecodingFailure(schema, -1, "Expected -1 to be positive")
    Util.expectDecodingFailure(schema, 0, "Expected 0 to be positive")
    Util.expectDecodingSuccess(schema, 1, 1 as PositiveInt)
    Util.expectDecodingFailure(schema, 1.5, "Expected 1.5 to be an integer")
    Util.expectDecodingSuccess(schema, 2, 2 as PositiveInt)
  })
})
