import * as T from "@effect-ts/core/Effect"
import * as E from "@effect-ts/core/Either"
import * as FC from "fast-check"

import * as S from "../src"
import * as Arbitrary from "../src/Arbitrary"
import * as Constructor from "../src/Constructor"
import * as Encoder from "../src/Encoder"
import * as Guard from "../src/Guard"
import * as Parser from "../src/Parser"

interface IdBrand {
  readonly IdBrand: unique symbol
}
type Id = S.Int & S.Positive & IdBrand

const idS = S.positiveInt["|>"](S.brand((_) => _ as Id))

interface NameBrand {
  readonly NameBrand: unique symbol
}
type Name = S.NonEmptyString & NameBrand

const nameS = S.nonEmptyString["|>"](S.brand((_) => _ as Name))

interface AddressBrand {
  readonly AddressBrand: unique symbol
}
type Address = S.NonEmptyString & AddressBrand

const addressS = S.nonEmptyString["|>"](S.brand((_) => _ as Address))

interface AgeBrand {
  readonly AgeBrand: unique symbol
}
type Age = S.Int & S.Positive & AgeBrand

const ageS = S.positiveInt["|>"](S.brand((_) => _ as Age))

interface SexBrand {
  readonly SexBrand: unique symbol
}

const Sex_ = S.literal("male", "female", "else")
type Sex = S.ParsedShapeOf<typeof Sex_> & SexBrand
const sexS = Sex_["|>"](S.brand((_) => _ as Sex))

const Person_ = S.struct({
  required: {
    Id: idS,
    Name: nameS,
    Age: ageS,
    Sex: sexS
  },
  optional: {
    Addresses: S.chunk(addressS)
  }
})["|>"](S.named("Person"))

interface Person extends S.ParsedShapeOf<typeof Person_> {}

const personS = S.opaque<Person>()(Person_)

const parsePerson = Parser.for(personS)["|>"](S.condemnFail)
const guardPerson = Guard.for(personS)
const createPerson = Constructor.for(personS)["|>"](S.condemnFail)
const arbitraryPerson = Arbitrary.for(personS)(FC)

const personArrayS = S.chunk(personS)

const parsePersonArray = Parser.for(personArrayS)["|>"](S.condemnFail)
const createPersonArray = Constructor.for(personArrayS)["|>"](S.condemnFail)
const guardPersonArray = Guard.for(personArrayS)

const personNoAddressS = personS.Api.omit("Addresses")

const createPersonNoAddresses = Constructor.for(personNoAddressS)["|>"](S.condemnFail)

const partialAddressS = S.partial({
  streetName: S.string["|>"](S.nonEmpty)
})

const parsePartialAddress = Parser.for(partialAddressS)["|>"](S.condemnFail)
const createPartialAddress = Constructor.for(partialAddressS)["|>"](S.condemnFail)
const arbitraryPartialAddress = Arbitrary.for(partialAddressS)(FC)
const guardPartialAddress = Guard.for(partialAddressS)
const encodePartialAddress = Encoder.for(partialAddressS)

describe("Schema", () => {
  it("should parse person", async () => {
    const result = await T.runPromise(
      T.either(
        parsePerson({
          Id: 0,
          Name: "Mike",
          Addresses: []
        })
      )
    )
    expect(result._tag).equals("Left")
    if (result._tag === "Left") {
      expect(result.left).equals(
        new S.CondemnException({
          message:
            "1 error(s) found while processing Person\n" +
            "└─ 1 error(s) found while processing an intersection\n" +
            "   └─ 1 error(s) found while processing member 0\n" +
            "      └─ 2 error(s) found while checking keys\n" +
            '         ├─ missing required key "Age"\n' +
            '         └─ missing required key "Sex"'
        })
      )
    }
    const result_ok = await T.runPromise(
      T.either(
        parsePerson({
          Id: 0,
          Name: "Mike",
          Age: 30,
          Sex: "male",
          Addresses: []
        })
      )
    )
    expect(result_ok._tag).equals("Right")
    if (result_ok._tag === "Right") {
      expect(guardPerson(result_ok.right)).equals(true)
    }
  })
  it("should create person", async () => {
    const result = await T.runPromise(
      T.either(
        createPerson({
          Age: 30,
          Id: 0,
          Name: "",
          Sex: "male",
          Addresses: []
        })
      )
    )
    expect(result._tag).equals("Left")
    if (result._tag === "Left") {
      expect(result.left).equals(
        new S.CondemnException({
          message:
            "1 error(s) found while processing Person\n" +
            "└─ 1 error(s) found while processing an intersection\n" +
            "   └─ 1 error(s) found while processing member 0\n" +
            "      └─ 1 error(s) found while processing a struct\n" +
            '         └─ 1 error(s) found while processing required key "Name"\n' +
            "            └─ 1 error(s) found while processing a refinement\n" +
            '               └─ cannot process "", expected to be not empty'
        })
      )
    }

    const result_ok = await T.runPromise(
      T.either(
        createPerson({
          Age: 30,
          Id: 0,
          Name: "Mike",
          Sex: "male",
          Addresses: []
        })
      )
    )
    expect(result_ok._tag).equals("Right")
  })
  it("should parse Person[]", async () => {
    const result = await T.runPromise(
      T.either(
        parsePersonArray([
          {
            Id: 0,
            Name: "Mike",
            Addresses: []
          }
        ])
      )
    )
    expect(result._tag).equals("Left")
    if (result._tag === "Left") {
      expect(result.left).equals(
        new S.CondemnException({
          message:
            "1 error(s) found while processing a collection\n" +
            "└─ 1 error(s) found while processing optional index 0\n" +
            "   └─ 1 error(s) found while processing Person\n" +
            "      └─ 1 error(s) found while processing an intersection\n" +
            "         └─ 1 error(s) found while processing member 0\n" +
            "            └─ 2 error(s) found while checking keys\n" +
            '               ├─ missing required key "Age"\n' +
            '               └─ missing required key "Sex"'
        })
      )
    }

    const result_2 = await T.runPromise(T.either(parsePersonArray({})))

    expect(result_2._tag).equals("Left")

    if (result_2._tag === "Left") {
      expect(result_2.left).equals(
        new S.CondemnException({
          message:
            "1 error(s) found while processing a refinement\n" +
            "└─ cannot process {}, expected an array"
        })
      )
    }

    const result_ok = await T.runPromise(
      T.either(parsePersonArray([{ Age: 30, Id: 0, Name: "Mike", Sex: "male" }]))
    )

    if (result_ok._tag === "Right") {
      expect(guardPersonArray(result_ok.right)).equals(true)
    }

    const result_ok_2 = await T.runPromise(
      T.either(
        createPersonArray([
          {
            Age: 30,
            Id: 0,
            Name: "Mike",
            Sex: "male",
            Addresses: []
          }
        ])
      )
    )

    if (result_ok_2._tag === "Right") {
      expect(guardPersonArray(result_ok_2.right)).equals(true)
    }
  })

  it("arbitrary", () => {
    FC.assert(FC.property(arbitraryPerson, guardPerson))
  })

  it("matchW/matchS", () => {
    FC.assert(
      FC.property(arbitraryPerson, (p) => {
        expect(["E", "F", "M"]).toContain(
          sexS.Api.matchW({
            else: () => "E" as const,
            female: () => "F" as const,
            male: () => "M" as const
          })(p.Sex)
        )
        expect(["E", "F", "M"]).toContain(
          sexS.Api.matchS({
            else: () => "E",
            female: () => "F",
            male: () => "M"
          })(p.Sex)
        )
      })
    )
  })

  it("person-no-address", async () => {
    const result = await T.runPromise(
      T.either(
        createPersonNoAddresses({
          Age: 30,
          Id: 0,
          Name: "Mike",
          Sex: "male"
        })
      )
    )

    expect(result._tag).toEqual("Right")
  })

  it("date", async () => {
    const date = new Date().toISOString()
    const parse = Parser.for(S.date)["|>"](S.condemnFail)
    const res_ok = await T.runPromise(T.either(parse(date)))
    expect(res_ok).toEqual(E.right(new Date(date)))
    const res_bad = await T.runPromise(T.either(parse("bad date")))
    expect(res_bad._tag).equals("Left")
    if (res_bad._tag === "Left") {
      expect(res_bad.left).toEqual(
        new S.CondemnException({
          message: 'cannot process "bad date", expected a date string'
        })
      )
    }
    const newDate = new Date()
    const encodeDate = Encoder.for(S.date)
    expect(encodeDate(newDate)).toEqual(newDate.toISOString())
  })

  it("partial", () =>
    T.gen(function* (_) {
      const res_ok = yield* _(
        T.either(
          parsePartialAddress({
            streetName: "Finchley Road"
          })
        )
      )

      const res_ok_empty = yield* _(T.either(parsePartialAddress({})))

      expect(res_ok._tag).toEqual("Right")
      expect(res_ok_empty._tag).toEqual("Right")

      const res_not_ok = yield* _(
        T.either(
          parsePartialAddress({
            streetName: 0
          })
        )
      )

      expect(res_not_ok).equals(
        E.left(
          new S.CondemnException({
            message:
              "1 error(s) found while processing a struct\n" +
              '└─ 1 error(s) found while processing optional key "streetName"\n' +
              "   └─ 1 error(s) found while processing a refinement\n" +
              "      └─ cannot process 0, expected an string"
          })
        )
      )

      const create_ok = yield* _(T.either(createPartialAddress({})))

      expect(create_ok._tag).toEqual("Right")

      const create_ok_2 = yield* _(
        T.either(
          createPartialAddress({
            streetName: "ok"
          })
        )
      )

      expect(create_ok_2._tag).toEqual("Right")

      const create_not_ok = yield* _(
        T.either(
          createPartialAddress({
            streetName: ""
          })
        )
      )

      expect(create_not_ok).toEqual(
        E.left(
          new S.CondemnException({
            message:
              "1 error(s) found while processing a struct\n" +
              '└─ 1 error(s) found while processing optional key "streetName"\n' +
              "   └─ 1 error(s) found while processing a refinement\n" +
              '      └─ cannot process "", expected to be not empty'
          })
        )
      )
    })["|>"](T.runPromise))

  it("arbitrary partial", () => {
    FC.assert(
      FC.property(arbitraryPartialAddress, (address) => {
        expect(guardPartialAddress(address)).equals(true)
        expect(encodePartialAddress(address)).toEqual(address)
        expect(encodePartialAddress(address)).not.equals(address)
        expect(address).equals(address)
      })
    )
  })
})

describe("Intersection", () => {
  const A = S.struct({
    required: {
      a: S.string
    }
  })
  const B = S.struct({
    required: {
      b: S.string
    }
  })
  const C = S.struct({
    required: {
      c: S.string
    }
  })
  const fields = A["|>"](S.intersect(B))["|>"](S.intersect(C))

  const parseFields = Parser.for(fields)["|>"](S.condemnFail)

  it("parse", async () => {
    const result = await T.runPromise(
      T.either(parseFields({ a: "(a)", b: "(b)", c: "(c)" }))
    )

    expect(result._tag).equals("Right")

    const result_not_ok = await T.runPromise(
      T.either(parseFields({ a: "(a)", c: "(c)" }))
    )

    expect(result_not_ok).equals(
      E.left(
        new S.CondemnException({
          message:
            "1 error(s) found while processing an intersection\n" +
            "└─ 1 error(s) found while processing member 0\n" +
            "   └─ 1 error(s) found while processing an intersection\n" +
            "      └─ 1 error(s) found while processing member 1\n" +
            "         └─ 1 error(s) found while checking keys\n" +
            '            └─ missing required key "b"'
        })
      )
    )
  })
})
