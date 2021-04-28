import "@effect-ts/core/Tracing/Enable"

import * as T from "@effect-ts/core/Effect"
import { assertsFailure } from "@effect-ts/core/Effect/Exit"
import { pretty } from "@effect-ts/system/Cause"

import * as S from "../src"
import * as Parser from "../src/Parser"

interface IdBrand {
  readonly IdBrand: unique symbol
}
type Id = S.Int & S.Positive & IdBrand

const idS = S.positiveInt["|>"](S.brand((_) => _ as Id))

interface NameBrand {
  readonly NameBrand: unique symbol
}
type Name = S.NonEmptyString & NameBrand

const nameS = S.nonEmptyString["|>"](S.brand((_) => _ as Name))

interface AddressBrand {
  readonly AddressBrand: unique symbol
}
type Address = S.NonEmptyString & AddressBrand

const addressS = S.nonEmptyString["|>"](S.brand((_) => _ as Address))

interface AgeBrand {
  readonly AgeBrand: unique symbol
}
type Age = S.Int & S.Positive & AgeBrand

const ageS = S.positiveInt["|>"](S.brand((_) => _ as Age))

interface SexBrand {
  readonly SexBrand: unique symbol
}

const sexS_ = S.literal("male", "female", "else")
type Sex = S.ParsedShapeOf<typeof sexS_> & SexBrand
const sexS = sexS_["|>"](S.brand((_) => _ as Sex))

const personS_ = S.struct({
  required: {
    Id: idS,
    Name: nameS,
    Age: ageS,
    Sex: sexS
  },
  optional: {
    Addresses: S.chunk(addressS)
  }
})["|>"](S.named("Person"))

interface Person extends S.ParsedShapeOf<typeof personS_> {}

const personS = S.opaque<Person>()(personS_)

const parsePerson = Parser.for(personS)["|>"](S.condemnFail)

describe("Tracing", () => {
  it("should trace error", async () => {
    const result = await T.runPromiseExit(
      parsePerson({
        Id: 0,
        Name: "Mike",
        Addresses: []
      })
    )
    assertsFailure(result)
    const prettyCause = pretty(result.cause)
    expect(prettyCause).toContain(
      "(@effect-ts/schema/test): test/tracing.test.ts:67:18"
    )
    expect(prettyCause).toContain("processing Person")
  })
})
