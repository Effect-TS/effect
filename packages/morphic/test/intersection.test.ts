import { right } from "@effect-ts/core/Classic/Either"
import { run, runEither } from "@effect-ts/core/Sync"

import { make } from "../src"
import type { Decoder } from "../src/Decoder"
import { decoder, decoderType } from "../src/Decoder"
import { encoderType } from "../src/Encoder"
import type { Encoder } from "../src/Encoder/base"
import { hash } from "../src/Hash"

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
const All = make((F) => F.intersection(A(F), B(F), C(F), D(F), E(F), G(F))())

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
  it("Hashes all", () => {
    expect(hash(All).hash).toEqual(
      '{"a":"string"} & {"b":"string"} & {"c":"string"} & {"d":"string"} & {"e":"string"} & {"g":"string"}'
    )
  })
  it("Has childs", () => {
    const gd: Decoder<string> = decoderType(All).getChilds()["g"].decoder
    const ge: Encoder<string, string> = encoderType(All).getChilds()["g"].encoder
    expect(runEither(gd.decode("ok"))).toEqual(right("ok"))
    expect(run(ge.encode("ok"))).toEqual("ok")
  })
})
