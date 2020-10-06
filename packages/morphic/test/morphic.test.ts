import * as E from "@effect-ts/core/Classic/Either"
import * as T from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"
import * as L from "@effect-ts/monocle/Lens"
import * as fc from "fast-check"

import type { AType, EType } from "../src"
import { make, opaque } from "../src"
import { derive as dec, report } from "../src/Decoder"
import { derive as enc } from "../src/Encoder"
import { derive as arb } from "../src/FastCheck"
import { derive as guard } from "../src/Guard"

const Person_ = make((F) =>
  F.interface({
    name: F.interface({
      first: F.string(),
      last: F.string()
    })
  })
)

interface Person extends AType<typeof Person_> {}
interface PersonRaw extends EType<typeof Person_> {}
const Person = opaque<PersonRaw, Person>()(Person_)

const EncoderPerson = enc(Person)
const DecoderPerson = dec(Person)
const ArbitraryPerson = arb(Person)
const IsPerson = guard(Person)
const firstNameLens = pipe(Person.lens, L.prop("name"), L.prop("first"))

describe("FastCheck", () => {
  it("Generate Person", () => {
    fc.check(
      fc.property(
        ArbitraryPerson,
        (p) => IsPerson.is(p) && typeof firstNameLens.get(p) === "string"
      )
    )
  })
  it("Encode/Decode Person", () => {
    fc.check(
      fc.property(ArbitraryPerson, (p) => {
        const res = T.runEither(DecoderPerson.decode(T.run(EncoderPerson.encode(p))))
        expect(res).toEqual(E.right(p))
      })
    )
  })
  it("Decodes Person", () => {
    expect(
      T.runEither(DecoderPerson.decode({ name: { first: "Michael", last: "Arnaldi" } }))
    ).toEqual(E.right({ name: { first: "Michael", last: "Arnaldi" } }))
  })
  it("Fail Decoding of Person", () => {
    expect(pipe(DecoderPerson.decode({}), T.mapError(report), T.runEither)).toEqual(
      E.left("not all the required fields are present")
    )
  })
})
