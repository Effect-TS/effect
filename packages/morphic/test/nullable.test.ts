import * as E from "@effect-ts/core/Either"
import * as O from "@effect-ts/core/Option"
import * as S from "@effect-ts/core/Sync"

import * as MO from "../src"
import { decoder } from "../src/Decoder"

const UpdateTPInput = MO.make((F) =>
  F.both(
    // required
    {
      id: F.string()
    },
    // optional (undefined)
    {
      selectedRentalCarSize: F.nullable(F.string()),
      selectedFlightType: F.string()
    }
  )
)

describe("Partial/Nullable", () => {
  it("should decode as O.some", () => {
    expect(
      S.runEither(
        decoder(UpdateTPInput).decode({ id: "ok", selectedRentalCarSize: "ok" })
      )
    ).toEqual(
      E.right({
        id: "ok",
        selectedRentalCarSize: O.some("ok")
      })
    )
  })
  it("should decode as O.none", () => {
    expect(
      S.runEither(
        decoder(UpdateTPInput).decode({ id: "ok", selectedRentalCarSize: null })
      )
    ).toEqual(
      E.right({
        id: "ok",
        selectedRentalCarSize: O.none
      })
    )
  })
  it("should decode as omitted", () => {
    expect(S.runEither(decoder(UpdateTPInput).decode({ id: "ok" }))).toEqual(
      E.right({
        id: "ok"
      })
    )
  })
  it("should decode as omitted if undefined", () => {
    expect(
      S.runEither(
        decoder(UpdateTPInput).decode({ id: "ok", selectedRentalCarSize: undefined })
      )
    ).toEqual(
      E.right({
        id: "ok"
      })
    )
  })
})
