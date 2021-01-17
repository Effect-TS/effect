import { right } from "@effect-ts/core/Either"
import { pipe } from "@effect-ts/core/Function"
import * as L from "@effect-ts/core/List"
import * as S from "@effect-ts/core/Sync"

import * as MO from "../src"
import { decode } from "../src/Decoder"

const Person_ = MO.make((F) =>
  F.interface(
    {
      name: F.string(),
      addresses: F.list(F.string())
    },
    { name: "Person" }
  )
)

export interface Person extends MO.AType<typeof Person_> {}
export interface PersonE extends MO.EType<typeof Person_> {}
export const Person = MO.opaque<PersonE, Person>()(Person_)

describe("Morphic List", () => {
  it("decodes", () => {
    const res = pipe(
      decode(Person)({ name: "Michael", addresses: ["a", "b", "c"] }),
      S.map((p) => L.isList(p.addresses)),
      S.runEither
    )

    expect(res).toEqual(right(true))
  })
})
