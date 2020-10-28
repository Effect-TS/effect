import * as E from "@effect-ts/core/Classic/Either"
import { pipe } from "@effect-ts/core/Function"
import type { TypeOf } from "@effect-ts/core/Newtype"
import { typeDef } from "@effect-ts/core/Newtype"
import * as T from "@effect-ts/core/Sync"
import * as I from "@effect-ts/monocle/Iso"
import * as L from "@effect-ts/monocle/Lens"
import * as fc from "fast-check"

import type { AType, EType } from "../src"
import { make, opaque, ShowURI } from "../src"
import { asserts } from "../src/Asserts"
import { decoder, decodeReport } from "../src/Decoder"
import { encoder } from "../src/Encoder"
import { equal } from "../src/Equal"
import { arbitrary } from "../src/FastCheck"
import { guard } from "../src/Guard"
import { show } from "../src/Show"
import { strict } from "../src/Strict"
import { strictDecoder } from "../src/StrictDecoder"

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

const IdT = typeDef<bigint>()("IdT")
interface IdT extends TypeOf<typeof IdT> {}

export const Id = make((F) =>
  F.interface({
    id: F.interface({
      id: F.newtypeIso(I.newtype<IdT>(), F.bigint())
    })
  })
)

export const InterA = make((F) => F.intersection([Person(F), Id(F)]))
export const InterB = make((F) => F.intersection([Id(F), Person(F)]))

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
  it("Track fields", () => {
    expect(
      T.runEither(decoder(Person).decode({ name: { first: "Michael", last: 1 } }))
    ).toEqual(
      E.left({
        _tag: "DecodeError",
        errors: [
          {
            context: {
              actual: 1,
              key: "name.last"
            },
            id: undefined,
            message: "number is not a string",
            name: undefined
          }
        ]
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
  it("Removes unknown fields", () => {
    expect(
      T.run(
        strict(Person).shrink({
          name: { first: "Michael", last: "Arnaldi", middle: "None" }
        })
      )
    ).toEqual({ name: { first: "Michael", last: "Arnaldi" } })
  })
  it("Decode & Removes unknown fields", () => {
    expect(
      T.runEither(
        strictDecoder(Person).decode({
          name: { first: "Michael", last: "Arnaldi", middle: "None" }
        })
      )
    ).toEqual(E.right({ name: { first: "Michael", last: "Arnaldi" } }))
  })
  it("Fail Decoding of Person", () => {
    expect(pipe(decodeReport(Person)({}), T.runEither)).toEqual(
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
  it("Assert Person", () => {
    const person: unknown = { name: { first: "Michael", last: "Arnaldi" } }

    asserts(Person, person)

    expect(person.name.first).toEqual("Michael")
  })
  it("Intersection is commutative", () => {
    expect(
      T.runEither(
        decoder(InterA).decode({
          name: { first: "Michael", last: "Arnaldi" },
          id: {
            id: "0"
          }
        })
      )
    ).toEqual(
      E.right({ name: { first: "Michael", last: "Arnaldi" }, id: { id: BigInt(0) } })
    )
    expect(
      T.runEither(
        decoder(InterB).decode({
          name: { first: "Michael", last: "Arnaldi" },
          id: {
            id: "0"
          }
        })
      )
    ).toEqual(
      E.right({ name: { first: "Michael", last: "Arnaldi" }, id: { id: BigInt(0) } })
    )
  })
})
