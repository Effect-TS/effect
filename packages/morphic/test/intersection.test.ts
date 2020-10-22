import { right } from "@effect-ts/core/Classic/Either"
import { runEither } from "@effect-ts/core/Sync"

import { make } from "../src"
import { decoder } from "../src/Decoder"

const A = make((F) =>
  F.interface({
    a: F.string()
  })
)
const B = make((F) =>
  F.interface({
    b: F.string()
  })
)
const C = make((F) =>
  F.interface({
    c: F.string()
  })
)
const D = make((F) =>
  F.interface({
    d: F.string()
  })
)
const E = make((F) =>
  F.interface({
    e: F.string()
  })
)
const G = make((F) =>
  F.interface({
    g: F.string()
  })
)
const All = make((F) => F.intersection([A(F), B(F), C(F), D(F), E(F), G(F)]))

describe("Intersection", () => {
  it("Decodes All", () => {
    expect(
      runEither(
        decoder(All).decode({
          a: "a",
          b: "b",
          c: "c",
          d: "d",
          e: "e",
          g: "g"
        })
      )
    ).toEqual(right({ a: "a", b: "b", c: "c", d: "d", e: "e", g: "g" }))
  })
})
