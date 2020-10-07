import * as E from "@effect-ts/core/Classic/Either"
import * as T from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"
import * as L from "@effect-ts/monocle/Lens"
import * as fc from "fast-check"

import type { AType, EType } from "../src"
import { make, opaque, ShowURI } from "../src"
import { decoder, report } from "../src/Decoder"
import { encoder } from "../src/Encoder"
import { equal } from "../src/Equal"
import { arbitrary } from "../src/FastCheck"
import { guard } from "../src/Guard"
import { show } from "../src/Show"

const Person_ = make((F) =>
  F.interface(
    {
      name: F.interface({
        first: F.string(),
        last: F.string()
      })
    },
    {
      conf: {
        [ShowURI]: (_) => ({
          show: (p) => `${p.name.first} ${p.name.last}`
        })
      }
    }
  )
)

interface Person extends AType<typeof Person_> {}
interface PersonRaw extends EType<typeof Person_> {}
const Person = opaque<PersonRaw, Person>()(Person_)

const firstNameLens = pipe(Person.lens, L.prop("name"), L.prop("first"))

describe("FastCheck", () => {
  it("Generate Person", () => {
    fc.check(
      fc.property(
        arbitrary(Person),
        (p) => guard(Person).is(p) && typeof firstNameLens.get(p) === "string"
      )
    )
  })
  it("Encode/Decode Person", () => {
    fc.check(
      fc.property(arbitrary(Person), (p) => {
        const res = T.runEither(
          decoder(Person).decode(T.run(encoder(Person).encode(p)))
        )
        expect(res).toEqual(E.right(p))
      })
    )
  })
  it("Decodes Person", () => {
    expect(
      T.runEither(
        decoder(Person).decode({ name: { first: "Michael", last: "Arnaldi" } })
      )
    ).toEqual(E.right({ name: { first: "Michael", last: "Arnaldi" } }))
  })
  it("Fail Decoding of Person", () => {
    expect(pipe(decoder(Person).decode({}), T.mapError(report), T.runEither)).toEqual(
      E.left("not all the required fields are present")
    )
  })
  it("Uses Equal", () => {
    expect(
      equal(Person).equals({ name: { first: "Michael", last: "Arnaldi" } })({
        name: { first: "Michael", last: "Arnaldi" }
      })
    ).toEqual(true)
    expect(
      equal(Person).equals({ name: { first: "Michael", last: "Arnaldi" } })({
        name: { first: "John", last: "Doe" }
      })
    ).toEqual(false)
  })
  it("Shows Person", () => {
    expect(show(Person).show({ name: { first: "Michael", last: "Arnaldi" } })).toEqual(
      "Michael Arnaldi"
    )
  })
})
