import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as Brand from "effect/Brand"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

type Int = number & Brand.Brand<"Int">
const Int = Brand.refined<Int>(
  (n) => Number.isSafeInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
)

type Positive = number & Brand.Brand<"Positive">
const Positive = Brand.refined<Positive>(
  (n) => n > 0,
  (n) => Brand.error(`Expected ${n} to be positive`)
)

type PositiveInt = Positive & Int
const PositiveInt = Brand.all(Int, Positive)

type Eur = number & Brand.Brand<"Eur">
const Eur = Brand.nominal<Eur>()

describe("fromBrand", () => {
  it("make", () => {
    const schema = S.NumberFromString.pipe(S.fromBrand(PositiveInt)).annotations({ identifier: "PositiveInt" })
    Util.assertions.make.succeed(schema, 1)
    Util.assertions.make.fail(
      schema,
      -1,
      `PositiveInt
└─ Predicate refinement failure
   └─ Expected -1 to be positive`
    )
  })

  it("[internal] should expose the original schema as `from`", () => {
    // the from property is not exposed in the public API
    const schema: any = S.Number.pipe(S.fromBrand(PositiveInt))
    strictEqual(schema.from, S.Number)
  })

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.Number.pipe(S.fromBrand(Int))) // refined
    Util.assertions.testRoundtripConsistency(S.Number.pipe(S.fromBrand(Eur))) // nominal
  })

  it("refined", async () => {
    const schema = S.Number.pipe(S.fromBrand(Brand.all(Positive, Int)))

    await Util.assertions.decoding.fail(
      schema,
      -0.5,
      `{ number | filter }
└─ Predicate refinement failure
   └─ Expected -0.5 to be positive, Expected -0.5 to be an integer`
    )
    Util.assertions.parseError(
      () => S.decodeUnknownSync(schema)(-0.5),
      `{ number | filter }
└─ Predicate refinement failure
   └─ Expected -0.5 to be positive, Expected -0.5 to be an integer`
    )
    await Util.assertions.decoding.fail(
      schema,
      -1,
      `{ number | filter }
└─ Predicate refinement failure
   └─ Expected -1 to be positive`
    )
    await Util.assertions.decoding.fail(
      schema,
      0,
      `{ number | filter }
└─ Predicate refinement failure
   └─ Expected 0 to be positive`
    )
    await Util.assertions.decoding.succeed(schema, 1, 1 as PositiveInt)
    await Util.assertions.decoding.fail(
      schema,
      1.5,
      `{ number | filter }
└─ Predicate refinement failure
   └─ Expected 1.5 to be an integer`
    )
    await Util.assertions.decoding.succeed(schema, 2, 2 as PositiveInt)
  })
})
