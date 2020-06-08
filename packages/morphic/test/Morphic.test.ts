import * as fc from "fast-check"

import * as M from "../src"
import * as EQ from "../src/eq"
import * as FC from "../src/fc"
import * as Model from "../src/model"
import * as SHOW from "../src/show"

import * as A from "@matechs/core/Array"
import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import * as Ex from "@matechs/core/Exit"
import { constant, flow, introduce, pipe } from "@matechs/core/Function"
import * as Index from "@matechs/core/Monocle/Index"
import * as I from "@matechs/core/Monocle/Iso"
import * as Lens from "@matechs/core/Monocle/Lens"
import * as P from "@matechs/core/Monocle/Prism"
import * as NT from "@matechs/core/Newtype"
import * as O from "@matechs/core/Option"

export function maxLength(length: number) {
  return (codec: Model.Codec<string>) =>
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

const Address = M.make((F) =>
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

const Person_ = M.make((F) =>
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
    "Person",
    {
      [M.ShowURI]: (_s, _e, _c) => ({
        show: (p) =>
          `{ name: (${_c.show.name.show(p.name)}), address: ${_c.show.address.show(
            p.address
          )} }`
      })
    }
  )
)

interface Person extends M.AType<typeof Person_> {}
interface PersonE extends M.EType<typeof Person_> {}

const Person = M.opaque<PersonE, Person>()(Person_)

const Age_ = M.make((F) =>
  F.partial(
    {
      age: F.number()
    },
    "Age"
  )
)

interface Age extends M.AType<typeof Age_> {}
interface AgeE extends M.EType<typeof Age_> {}

const Age = M.opaque<AgeE, Age>()(Age_)

const PersonEQ = EQ.derive(Person)
const PersonArb = FC.derive(Person)
const PersonShow = SHOW.derive(Person)

const PersonWithAge_ = M.make((F) =>
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

const PersonWithAge = M.opaque<PersonWithAgeE, PersonWithAge>()(PersonWithAge_)

const Tagged = M.make((F) =>
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

const TaggedADT = M.makeADT("_tag")(
  {
    left: M.make((F) =>
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
    right: M.make((F) =>
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

interface RecE {
  readonly id: string
  readonly next: RecE | null
}

interface Rec {
  readonly id: string
  readonly next: O.Option<Rec>
}

const Rec = M.make((F) =>
  F.recursive<RecE, Rec>(
    (_) =>
      F.interface(
        {
          id: F.string(),
          next: F.nullable(_)
        },
        "RecInner"
      ),
    "Rec"
  )
)

const strIso = I.create(
  (s: string) => s.split(""),
  (a) => a.join("")
)

const nonEmptyStrPrism = P.create(
  (s: string) => (s.length > 0 ? O.some(s) : O.none),
  (s) => s
)

const StrAsArray = M.make((F) => F.iso(F.string(), strIso, "StrAsArray"))
const NonEmptyStr = M.make((F) => F.prism(F.string(), nonEmptyStrPrism, "NonEmptyStr"))

const UsingOptional = M.make((F) =>
  F.interface(
    {
      foo: F.optional(F.string()),
      bar: F.string()
    },
    "UsingOptional"
  )
)

const UsingBoth = M.make((F) =>
  F.both(
    {
      bar: F.string()
    },
    {
      foo: F.string()
    },
    "UsingBoth"
  )
)

const { make } = M.makeFor<{
  [M.ShowURI]: {
    prefix: string
  }
}>({})

const PersonA_ = make((F) =>
  F.array(Person(F), {
    [M.ShowURI]: (_, { prefix }) => ({
      show: (p) => `${prefix}:${_.show(p)}`
    })
  })
)

interface PersonA extends M.AType<typeof PersonA_> {}

const PersonA = M.opaque_<PersonA>()(PersonA_)

const ShowPersonA = SHOW.deriveFor(make)({
  [M.ShowURI]: {
    prefix: "prefix"
  }
})(PersonA)

describe("Morphic", () => {
  it("should use model interpreter", () => {
    const result_0 = Person.decodeT({
      name: "Michael",
      address: [
        A.range(0, 25)
          .map((n) => `${n}`)
          .join("")
      ]
    })
    const result_1 = Person.decodeT({
      name: "Michael",
      address: []
    })
    const result_2 = Person.decodeT({
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
    const result = Person.decode({
      name: "Michael",
      address: ["177 Finchley Road"]
    })
    const result2 = Person.decode({
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
        Person.decode({
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
        Person.decode({
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
    const validPerson = Person.createT({
      name: "Michael",
      address: [I.wrap(AddressISO)("177 Finchley")]
    })

    const invalidPerson = Person.createT({
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
    const result = Person.decode({
      name: "Michael",
      address: ["177 Finchley Road"]
    })

    expect(pipe(result, E.map(PersonShow.show))).toStrictEqual(
      E.right(
        '{ name: ("Michael"), address: <AddressArray>([~Address~("177 Finchley Road")]) }'
      )
    )
  })
  it("use intersection show", () => {
    const result = PersonWithAge.decode({
      name: "Michael",
      address: ["177 Finchley Road"],
      age: 29
    })

    expect(pipe(result, E.map(SHOW.derive(PersonWithAge).show))).toStrictEqual(
      E.right(
        '{ name: ("Michael"), address: <AddressArray>([~Address~("177 Finchley Road")]), age: 29 }'
      )
    )
  })
  it("use tagged union show", () => {
    const right = Tagged.build({
      _tag: "right",
      value: "ok"
    })

    const showTagged = SHOW.derive(Tagged)

    expect(showTagged.show(right)).toStrictEqual("Right: ok")
  })
  it("use M.makeTagged union show", () => {
    const right = TaggedADT.of.right({
      value: "ok"
    })

    const showTagged = SHOW.derive(TaggedADT)

    expect(showTagged.show(right)).toStrictEqual("Right: ok")
  })
  it("use selectMorph union show", () => {
    const left = SubADT.of.left({
      value: "ok"
    })

    const showTagged = SHOW.derive(SubADT)

    expect(showTagged.show(left)).toStrictEqual("Shrink: ok")
  })
  it("use excludeMorph union show", () => {
    const right = ExcADT.of.right({
      value: "ok"
    })

    const showTagged = SHOW.derive(ExcADT)

    expect(showTagged.show(right)).toStrictEqual("Shrink: ok")
  })
  it("use recursion", () => {
    const result = Rec.decode({
      id: "a",
      next: {
        id: "b",
        next: {
          id: "c",
          next: null
        }
      }
    })

    expect(result).toStrictEqual(
      E.right({
        id: "a",
        next: O.some({
          id: "b",
          next: O.some({
            id: "c",
            next: O.none
          })
        })
      })
    )
  })
  it("precise interpreter", () => {
    const result = Person.decodeT(
      {
        name: "Michael",
        address: ["177 Finchley Road"],
        age: 29
      },
      "precise"
    )

    expect(T.runSync(result)).toStrictEqual({
      _tag: "Raise",
      error: {
        _tag: "ValidationErrors",
        errors: [
          'Invalid value {"name":"Michael","address":["177 Finchley Road"],"age":29} supplied to : Person'
        ]
      },
      next: { _tag: "None" }
    })
  })

  it("use iso", () => {
    const result = StrAsArray.decode("hello")

    expect(result).toStrictEqual(E.right(["h", "e", "l", "l", "o"]))

    expect(StrAsArray.encode(["h", "e", "l", "l", "o"])).toStrictEqual("hello")
  })

  it("using optional", () => {
    const opt = UsingOptional.decode({
      foo: "ok",
      bar: "bar"
    })
    const opt2 = UsingOptional.decode({
      bar: "bar"
    })

    expect(opt).toStrictEqual(E.right({ foo: "ok", bar: "bar" }))
    expect(opt2).toStrictEqual(E.right({ foo: undefined, bar: "bar" }))
  })

  it("using both", () => {
    const opt = UsingBoth.decode({
      foo: "ok",
      bar: "bar"
    })
    const opt2 = UsingBoth.decode({
      bar: "bar"
    })

    expect(opt).toStrictEqual(E.right({ foo: "ok", bar: "bar" }))
    expect(opt2).toStrictEqual(E.right({ bar: "bar" }))
  })

  it("use prism", () => {
    const fail = NonEmptyStr.decode("")
    const succeed = NonEmptyStr.decode("ok")

    expect(E.isLeft(fail)).toStrictEqual(true)
    expect(E.isRight(succeed)).toStrictEqual(true)
  })

  it("use with wider env", () => {
    const result = PersonA.decode([
      { name: "Michael", address: ["177 Finchley Road"] },
      { name: "John", address: ["178 Finchley Road"] }
    ])

    expect(pipe(result, E.map(ShowPersonA.show))).toStrictEqual(
      E.right(
        'prefix:[{ name: ("Michael"), address: <AddressArray>([~Address~("177 Finchley Road")]) }, { name: ("John"), address: <AddressArray>([~Address~("178 Finchley Road")]) }]'
      )
    )
  })
})
