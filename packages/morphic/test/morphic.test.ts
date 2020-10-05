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

describe("FastCheck", () => {
  it("Generate Person", () => {
    fc.check(fc.property(ArbitraryPerson, (p) => typeof p.name.first === "string"))
  })
})
