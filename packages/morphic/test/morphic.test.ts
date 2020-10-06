import { pipe } from "@effect-ts/core/Function"
import * as L from "@effect-ts/monocle/Lens"
import * as fc from "fast-check"

import type { AType, EType } from "../src"
import { make, opaque } from "../src"
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
})
