import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as Brand from "effect/Brand"
import { describe, expect, it } from "vitest"

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
  it("property tests", () => {
    Util.roundtrip(S.Number.pipe(S.fromBrand(Int))) // refined
    Util.roundtrip(S.Number.pipe(S.fromBrand(Eur))) // nominal
  })

  it("refined", async () => {
    const schema = S.Number.pipe(S.fromBrand(Brand.all(Positive, Int)))

    await Util.expectDecodeUnknownFailure(
      schema,
      -0.5,
      `<refinement schema>
└─ Predicate refinement failure
   └─ Expected -0.5 to be positive, Expected -0.5 to be an integer`
    )
    expect(() => S.decodeUnknownSync(schema)(-0.5)).toThrow(
      new Error(`<refinement schema>
└─ Predicate refinement failure
   └─ Expected -0.5 to be positive, Expected -0.5 to be an integer`)
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      -1,
      `<refinement schema>
└─ Predicate refinement failure
   └─ Expected -1 to be positive`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      0,
      `<refinement schema>
└─ Predicate refinement failure
   └─ Expected 0 to be positive`
    )
    await Util.expectDecodeUnknownSuccess(schema, 1, 1 as PositiveInt)
    await Util.expectDecodeUnknownFailure(
      schema,
      1.5,
      `<refinement schema>
└─ Predicate refinement failure
   └─ Expected 1.5 to be an integer`
    )
    await Util.expectDecodeUnknownSuccess(schema, 2, 2 as PositiveInt)
  })
})
