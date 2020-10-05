import { pipe } from "@effect-ts/core/Function"
import * as L from "@effect-ts/monocle/Lens"
import * as fc from "fast-check"

import { make } from "../src"
import { derive as arb } from "../src/FastCheck"

const Person = make((F) =>
  F.interface({
    name: F.interface({
      first: F.string(),
      last: F.string()
    })
  })
)

const ArbitraryPerson = arb(Person)
const firstNameLens = pipe(Person.lens, L.prop("name"), L.prop("first"))

describe("FastCheck", () => {
  it("Generate Person", () => {
    fc.check(
      fc.property(ArbitraryPerson, (p) => typeof firstNameLens.get(p) === "string")
    )
  })
})
