import * as fc from "fast-check"

import * as M from "../src"

import * as A from "@matechs/core/Array"
import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import * as Ex from "@matechs/core/Exit"
import { pipe, introduce } from "@matechs/core/Function"
import { flow, constant } from "@matechs/core/Function"
import * as Model from "@matechs/core/Model"
import * as Index from "@matechs/core/Monocle/Index"
import * as I from "@matechs/core/Monocle/Iso"
import * as Lens from "@matechs/core/Monocle/Lens"
import * as NT from "@matechs/core/Newtype"

const { summon, tagged } = M.summonFor({})

const deriveEq = M.eqFor(summon)({})
const deriveArb = M.arbFor(summon)({})
const deriveShow = M.showFor(summon)({})

export function maxLength(length: number) {
  return (codec: Model.Type<string>) =>
    Model.withValidate_(codec, (u, c) =>
      E.chain_(codec.validate(u, c), (x) =>
        x.length <= length ? Model.success(x) : Model.failure(u, c)
      )
    )
}

interface Address
  extends NT.Newtype<
    {
      readonly Address: unique symbol
    },
    string
  > {}

const AddressISO = NT.iso<Address>()

const Address = summon((F) =>
  F.newtype<Address>("Address")(
    F.string({
      [M.ModelURI]: flow(
        maxLength(20),
        Model.withMessage(() => "Invalid Address")
      ),
      [M.FastCheckURI]: (_) => _.filter((s) => s.length <= 20)
    }),
    {
      [M.ShowURI]: (_s, _e, _c) => ({
        show: (a) => `~Address~(${_c.showNewtype.show(a)})`
      })
    }
  )
)

const Person_ = summon((F) =>
  F.interface(
    {
      name: F.string(),
      address: F.nonEmptyArray(Address(F), {
        [M.ModelURI]: Model.withFirstMessage(() => "Invalid Address Array"),
        [M.ShowURI]: (_s, _e, _c) => ({
          show: (a) => `<AddressArray>(${A.getShow(_c.show).show(a)})`
        })
      })
    },
    "Person"
  )
)

interface Person extends M.AType<typeof Person_> {}
interface PersonE extends M.EType<typeof Person_> {}

const Person = M.AsOpaque<PersonE, Person>()(Person_)

const Age_ = summon((F) =>
  F.interface(
    {
      age: F.number()
    },
    "Age"
  )
)

interface Age extends M.AType<typeof Age_> {}
interface AgeE extends M.EType<typeof Age_> {}

const Age = M.AsOpaque<AgeE, Age>()(Age_)

const PersonEQ = deriveEq(Person)
const PersonArb = deriveArb(Person)
const PersonShow = deriveShow(Person)

const PersonWithAge_ = summon((F) =>
  F.intersection([Person(F), Age(F)], "PersonWithAge", {
    [M.ShowURI]: (_s, _e, _c) => ({
      show: (pe) =>
        introduce(_c.shows[0].show(pe))((a) => a.substring(0, a.length - 2)) +
        "," +
        introduce(_c.shows[1].show(pe))((b) => b.substring(1, b.length))
    })
  })
)

interface PersonWithAge extends M.AType<typeof PersonWithAge_> {}
interface PersonWithAgeE extends M.EType<typeof PersonWithAge_> {}

const PersonWithAge = M.AsOpaque<PersonWithAgeE, PersonWithAge>()(PersonWithAge_)

const Tagged = summon((F) =>
  F.taggedUnion(
    "_tag",
    {
      left: F.interface(
        {
          _tag: F.stringLiteral("left"),
          value: F.string()
        },
        "left"
      ),
      right: F.interface(
        {
          _tag: F.stringLiteral("right"),
          value: F.string()
        },
        "right",
        {
          [M.ShowURI]: () => ({
            show: (r) => r.value
          })
        }
      )
    },
    "Tagged",
    {
      [M.ShowURI]: (_s, _e, _c) => ({
        show: (a) =>
          a._tag === "left"
            ? `Left: ${_c.shows.left.show(a)}`
            : `Right: ${_c.shows.right.show(a)}`
      })
    }
  )
)

const TaggedADT = tagged("_tag")(
  {
    left: summon((F) =>
      F.interface(
        {
          _tag: F.stringLiteral("left"),
          value: F.string()
        },
        "left",
        {
          [M.ShowURI]: () => ({
            show: (r) => r.value
          })
        }
      )
    ),
    right: summon((F) =>
      F.interface(
        {
          _tag: F.stringLiteral("right"),
          value: F.string()
        },
        "right",
        {
          [M.ShowURI]: () => ({
            show: (r) => r.value
          })
        }
      )
    )
  },
  "TaggedADT",
  {
    [M.ShowURI]: (_s, _e, _c) => ({
      show: (a) =>
        a._tag === "left"
          ? `Left: ${_c.shows.left.show(a)}`
          : `Right: ${_c.shows.right.show(a)}`
    })
  }
)

const SubADT = TaggedADT.selectMorph(["left"], "SubADT", {
  [M.ShowURI]: (_s, _e, _c) => ({
    show: (l) => `Shrink: ${_c.shows.left.show(l)}`
  })
})
const ExcADT = TaggedADT.excludeMorph(["left"], "ExcADT", {
  [M.ShowURI]: (_s, _e, _c) => ({
    show: (l) => `Shrink: ${_c.shows.right.show(l)}`
  })
})

describe("Morphic", () => {
  it("should use model interpreter", () => {
    const result_0 = Person.decode({
      name: "Michael",
      address: [
        A.range(0, 25)
          .map((n) => `${n}`)
          .join("")
      ]
    })
    const result_1 = Person.decode({
      name: "Michael",
      address: []
    })
    const result_2 = Person.decode({
      name: "Michael",
      address: ["177 Finchley Road"]
    })

    expect(T.runSync(result_0)).toStrictEqual(
      Ex.raise(M.validationErrors(["Invalid Address"]))
    )
    expect(T.runSync(result_1)).toStrictEqual(
      Ex.raise(M.validationErrors(["Invalid Address Array"]))
    )
    expect(T.runSync(result_2)).toStrictEqual(
      Ex.done({
        name: "Michael",
        address: ["177 Finchley Road"]
      })
    )
  })

  it("should use eq", () => {
    const result = Person.type.decode({
      name: "Michael",
      address: ["177 Finchley Road"]
    })
    const result2 = Person.type.decode({
      name: "Michael",
      address: ["178 Finchley Road"]
    })

    expect(
      pipe(
        E.sequenceT(result, result),
        E.map(([a, b]) => PersonEQ.equals(a, b))
      )
    ).toStrictEqual(E.right(true))
    expect(
      pipe(
        E.sequenceT(result, result2),
        E.map(([a, b]) => PersonEQ.equals(a, b))
      )
    ).toStrictEqual(E.right(false))
  })

  it("should use monocle", () => {
    const addressIndex = Index.nonEmptyArray<Address>()
    const addresses = Person.lensFromPath(["address"])

    const addressN = (n: number) =>
      pipe(addresses, Lens.composeOptional(addressIndex.index(n)))

    expect(
      pipe(
        Person.type.decode({
          name: "Michael",
          address: ["177 Finchley Road"]
        }),
        E.chain(
          flow(
            addressN(1).getOption,
            E.fromOption(() => "Second Address Not Found")
          )
        )
      )
    ).toStrictEqual(E.left("Second Address Not Found"))

    expect(
      pipe(
        Person.type.decode({
          name: "Michael",
          address: ["177 Finchley Road", "ok"]
        }),
        E.chain(
          flow(
            addressN(1).getOption,
            E.fromOption(() => "Second Address Not Found")
          )
        )
      )
    ).toStrictEqual(E.right("ok"))
  })

  it("should use fast-check", () =>
    fc.assert(fc.property(PersonArb, (p) => E.isRight(Person.create(p)))))

  it("should use valudate", () => {
    const validPerson = Person.validate({
      name: "Michael",
      address: [I.wrap(AddressISO)("177 Finchley")]
    })

    const invalidPerson = Person.validate({
      name: "Michael",
      address: [I.wrap(AddressISO)(A.range(0, 25).map(constant("a")).join(""))]
    })

    expect(T.runSync(validPerson)).toStrictEqual(
      Ex.done({
        name: "Michael",
        address: ["177 Finchley"]
      })
    )

    expect(T.runSync(invalidPerson)).toStrictEqual(
      Ex.raise(M.validationErrors(["Invalid Address"]))
    )
  })

  it("use show", () => {
    const result = Person.type.decode({
      name: "Michael",
      address: ["177 Finchley Road"]
    })

    expect(pipe(result, E.map(PersonShow.show))).toStrictEqual(
      E.right(
        '{ name: "Michael", address: <AddressArray>([~Address~("177 Finchley Road")]) }'
      )
    )
  })
  it("use intersection show", () => {
    const result = PersonWithAge.type.decode({
      name: "Michael",
      address: ["177 Finchley Road"],
      age: 29
    })

    expect(pipe(result, E.map(deriveShow(PersonWithAge).show))).toStrictEqual(
      E.right(
        '{ name: "Michael", address: <AddressArray>([~Address~("177 Finchley Road")]), age: 29 }'
      )
    )
  })
  it("use tagged union show", () => {
    const right = Tagged.build({
      _tag: "right",
      value: "ok"
    })

    const showTagged = deriveShow(Tagged)

    expect(showTagged.show(right)).toStrictEqual("Right: ok")
  })
  it("use makeTagged union show", () => {
    const right = TaggedADT.of.right({
      value: "ok"
    })

    const showTagged = deriveShow(TaggedADT)

    expect(showTagged.show(right)).toStrictEqual("Right: ok")
  })
  it("use selectMorph union show", () => {
    const left = SubADT.of.left({
      value: "ok"
    })

    const showTagged = deriveShow(SubADT)

    expect(showTagged.show(left)).toStrictEqual("Shrink: ok")
  })
  it("use excludeMorph union show", () => {
    const right = ExcADT.of.right({
      value: "ok"
    })

    const showTagged = deriveShow(ExcADT)

    expect(showTagged.show(right)).toStrictEqual("Shrink: ok")
  })
})
