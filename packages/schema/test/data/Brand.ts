import * as B from "@effect/data/Brand"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

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
    Util.roundtrip(S.fromBrand(Int)(S.number)) // refined
    Util.roundtrip(S.fromBrand(Eur)(S.number)) // nominal
  })

  it("refined", async () => {
    const schema = S.number.pipe(S.fromBrand(B.all(Positive, Int)))

    await Util.expectParseFailure(
      schema,
      -0.5,
      "Expected -0.5 to be positive, Expected -0.5 to be an integer"
    )
    expect(() => S.parseSync(schema)(-0.5)).toThrowError(
      new Error(`error(s) found
└─ Expected -0.5 to be positive, Expected -0.5 to be an integer`)
    )
    await Util.expectParseFailure(schema, -1, "Expected -1 to be positive")
    await Util.expectParseFailure(schema, 0, "Expected 0 to be positive")
    await Util.expectParseSuccess(schema, 1, 1 as PositiveInt)
    await Util.expectParseFailure(schema, 1.5, "Expected 1.5 to be an integer")
    await Util.expectParseSuccess(schema, 2, 2 as PositiveInt)
  })
})
